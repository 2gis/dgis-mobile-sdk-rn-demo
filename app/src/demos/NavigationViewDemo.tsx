import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  CarRouteSearchOptions,
  Duration,
  GeoPointWithElevation,
  ImageLoader,
  LogicalPixel,
  MapObjectManager,
  MapView,
  Marker,
  MarkerOptions,
  NavigationManager,
  NavigationView,
  RouteBuildOptions,
  RouteDistance,
  RouteSearchOptions,
  RouteSearchPoint,
  SimulationConstantSpeed,
  SimulationSpeedMode,
  TrafficRouter,
} from '@2gis/dgis-mobile-sdk-full';
import type { GeoPoint } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useMapController } from '../hooks/useMapController';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { useChannelEffect } from '../hooks/useChannelEffect';
import { useNative } from '../hooks/useNative';
import { isNativeDestroyedError } from '../hooks/nativeObjectLifecycle';
import { Centered } from '../components/Centered';
import {
  loadNavigationPointMarkerImage,
  type DemoImageCache,
  type NavigationPointMarkerType,
} from './mapDemoAssets';
import { colors, radius, spacing, typography } from '../theme/theme';

const DEFAULT_SPEED_KPH = 60;
const SPEED_STEP_KPH = 5;
const MIN_SPEED_KPH = 5;
const MAX_SPEED_KPH = 200;
const KPH_IN_MPS = 3.6;
const ROUTE_POINT_MARKER_WIDTH = 30;

type Phase = 'selectStart' | 'selectFinish' | 'settings' | 'navigation';

function clampSpeed(value: number): number {
  return Math.min(MAX_SPEED_KPH, Math.max(MIN_SPEED_KPH, value));
}

/**
 * Navigation demo: pick the start and the finish point with a long tap, choose
 * whether to simulate the drive and at what speed, then run the navigator with
 * `NavigationView` on top of the map.
 */
export function NavigationViewDemo() {
  const context = useSdk();
  useInitializeLocationService();

  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const navigationManager = useNative<NavigationManager>(() => {
    const manager = new NavigationManager(context);
    // Remove the time/route-difference thresholds to make better-route
    // prompts easier to exercise in this demo.
    const settings = manager.alternativeRoutesProviderSettings;
    settings.betterRouteEnabled = true;
    settings.betterRouteTimeCostThreshold = Duration.ofSeconds(0);
    settings.betterRouteLengthThreshold = new RouteDistance({
      millimeters: 0n,
    });
    return manager;
  }, [context]);
  const trafficRouter = useNative<TrafficRouter>(
    () => new TrafficRouter(context),
    [context],
  );
  const objectManager = useNative<MapObjectManager>(
    () => (mapController ? new MapObjectManager(mapController.map) : null),
    [mapController],
  );

  const [phase, setPhase] = useState<Phase>('selectStart');
  const [useSimulation, setUseSimulation] = useState(true);
  const [speedKph, setSpeedKph] = useState(DEFAULT_SPEED_KPH);
  const [error, setError] = useState<string | null>(null);

  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const startPointRef = useRef<GeoPoint | null>(null);
  const finishPointRef = useRef<GeoPoint | null>(null);

  const runRouteSearch = useLatestFuture();

  const imageLoaderRef = useRef<ImageLoader | null>(null);
  if (imageLoaderRef.current === null) {
    imageLoaderRef.current = new ImageLoader(context);
  }
  const imageCacheRef = useRef<DemoImageCache>(new Map());

  const addMarker = useCallback(
    (point: GeoPoint, type: NavigationPointMarkerType) => {
      const loader = imageLoaderRef.current;
      if (!loader || !objectManager) {
        return;
      }

      loadNavigationPointMarkerImage(loader, imageCacheRef.current, type)
        .then(icon => {
          objectManager.addObject(
            new Marker(
              new MarkerOptions({
                position: new GeoPointWithElevation({
                  latitude: point.latitude,
                  longitude: point.longitude,
                }),
                icon,
                iconWidth: new LogicalPixel({
                  value: ROUTE_POINT_MARKER_WIDTH,
                }),
              }),
            ),
          );
        })
        .catch(iconError =>
          setError(`Marker icon failed: ${String(iconError)}`),
        );
    },
    [objectManager],
  );

  const reset = useCallback(() => {
    startPointRef.current = null;
    finishPointRef.current = null;
    objectManager?.removeAll();
    setPhase('selectStart');
  }, [objectManager]);

  useChannelEffect(
    () => mapController?.gestureRecognizer.longTouch,
    screenPoint => {
      const geoPoint =
        mapController?.map.camera.projection.screenToMap(screenPoint);
      if (!geoPoint) {
        return;
      }

      if (phaseRef.current === 'selectStart') {
        startPointRef.current = geoPoint;
        addMarker(geoPoint, 'start');
        setError(null);
        setPhase('selectFinish');
      } else if (phaseRef.current === 'selectFinish') {
        finishPointRef.current = geoPoint;
        addMarker(geoPoint, 'finish');
        setPhase('settings');
      }
    },
    [mapController, addMarker],
  );

  const startNavigation = useCallback(() => {
    const start = startPointRef.current;
    const finish = finishPointRef.current;
    const map = mapController?.map;
    if (!start || !finish || !map || !navigationManager || !trafficRouter) {
      return;
    }

    const finishPoint = new RouteSearchPoint({ coordinates: finish });
    const routeSearchOptions = RouteSearchOptions.car(
      new CarRouteSearchOptions({}),
    );

    setPhase('navigation');
    runRouteSearch(
      trafficRouter.findRoute(
        new RouteSearchPoint({ coordinates: start }),
        finishPoint,
        routeSearchOptions,
      ),
      routes => {
        const route = routes[0];
        if (!route) {
          setError('Route not found');
          reset();
          return;
        }

        const routeBuildOptions = new RouteBuildOptions({
          finishPoint,
          routeSearchOptions,
        });

        if (useSimulation) {
          navigationManager.simulationSettings.speedMode =
            SimulationSpeedMode.speed(
              new SimulationConstantSpeed({ speed: speedKph / KPH_IN_MPS }),
            );
        }

        navigationManager.mapManager.addMap(map);
        map.camera.setBehaviour(
          navigationManager.mapFollowController.cameraBehaviour,
        );

        if (useSimulation) {
          navigationManager.startSimulation(routeBuildOptions, route);
        } else {
          navigationManager.start(routeBuildOptions, route);
        }

        objectManager?.removeAll();
      },
      searchError => {
        setError(`Route search failed: ${String(searchError)}`);
        reset();
      },
    );
  }, [
    mapController,
    navigationManager,
    objectManager,
    reset,
    runRouteSearch,
    speedKph,
    trafficRouter,
    useSimulation,
  ]);

  const stopNavigation = useCallback(() => {
    const map = mapController?.map;
    if (!navigationManager || !map) {
      return;
    }

    try {
      navigationManager.stop();
      navigationManager.mapManager.removeMap(map);
    } catch (stopError) {
      if (!isNativeDestroyedError(stopError)) {
        throw stopError;
      }
    }
    reset();
  }, [mapController, navigationManager, reset]);

  const handleFinishRoutePress = useCallback(
    ({ isFreeRoam }: { isFreeRoam: boolean }) => {
      if (!navigationManager) {
        return;
      }

      if (isFreeRoam) {
        stopNavigation();
      } else {
        navigationManager.startFreeRoam();
      }
    },
    [navigationManager, stopNavigation],
  );

  useEffect(() => {
    return () => {
      try {
        navigationManager?.stop();
      } catch (stopError) {
        if (!isNativeDestroyedError(stopError)) {
          throw stopError;
        }
      }
    };
  }, [navigationManager]);

  if (!mapController || !navigationManager || !trafficRouter) {
    return <Centered text={controllerState.status} />;
  }

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      {phase === 'navigation' && (
        <NavigationView
          sdkContext={context}
          navigationManager={navigationManager}
          mapController={mapController}
          onFinishRoutePress={handleFinishRoutePress}
        />
      )}

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={phase === 'settings'}
        transparent
        animationType="fade"
        onRequestClose={reset}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Navigation settings</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Use simulation</Text>
              <Switch value={useSimulation} onValueChange={setUseSimulation} />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>
                Simulation speed: {speedKph} km/h
              </Text>
              <View style={styles.stepper}>
                <Pressable
                  style={[
                    styles.stepperButton,
                    !useSimulation && styles.disabled,
                  ]}
                  disabled={!useSimulation}
                  onPress={() =>
                    setSpeedKph(current => clampSpeed(current - SPEED_STEP_KPH))
                  }
                >
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.stepperButton,
                    !useSimulation && styles.disabled,
                  ]}
                  disabled={!useSimulation}
                  onPress={() =>
                    setSpeedKph(current => clampSpeed(current + SPEED_STEP_KPH))
                  }
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={reset}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={startNavigation}>
                <Text style={styles.primaryButtonText}>Start</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  error: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.errorSurface,
    color: colors.errorText,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.caption,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: {
    color: colors.textPrimary,
    ...typography.title,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.textPrimary,
    ...typography.body,
  },
  stepper: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepperButton: {
    minWidth: 40,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  stepperText: {
    color: colors.textPrimary,
    ...typography.title,
  },
  disabled: {
    opacity: 0.4,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  secondaryButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    ...typography.body,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: colors.textInverse,
    ...typography.body,
  },
});
