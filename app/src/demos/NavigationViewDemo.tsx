import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Duration,
  Future,
  ImageLoader,
  MapObjectManager,
  MapView,
  Marker,
  NavigationManager,
  NavigationView,
  RouteSearchPointInit,
  RouteSearchOptions,
  SimulationSpeedMode,
  TrafficRoute,
  TrafficRouter,
} from '@2gis/dgis-mobile-sdk-full';
import type { GeoPoint } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useMapController } from '../hooks/useMapController';
import {
  useDefaultMapAppearance,
  useDefaultMapOptions,
} from '../hooks/useDefaultMapOptions';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { useChannelEffect } from '../hooks/useChannelEffect';
import { Centered } from '../components/Centered';
import {
  loadNavigationPointMarkerImage,
  type DemoImageCache,
  type NavigationPointMarkerType,
} from './mapDemoAssets';
import { colors, radius, spacing, typography } from '../theme/theme';
import {
  defaultNavigationDemoSettings,
  NavigationDemoSettingsForm,
} from './NavigationDemoSettings';
import { useNavigationMiniMap } from '../hooks/useNavigationMiniMap';

const KPH_IN_MPS = 3.6;
const ROUTE_POINT_MARKER_WIDTH = 30;

type Phase =
  | 'selectStart'
  | 'selectFinish'
  | 'settings'
  | 'searching'
  | 'navigation';

/**
 * Long touch selects start/finish; taps between them add ordered waypoints.
 * Configure route navigation, simulation, or free roam before starting.
 */
export function NavigationViewDemo() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.suspenseFallback} />}>
      <NavigationViewDemoContent />
    </Suspense>
  );
}

function NavigationViewDemoContent() {
  const context = useSdk();
  const insets = useSafeAreaInsets();
  useInitializeLocationService();

  const options = useDefaultMapOptions(context);
  const miniMapAppearance = useDefaultMapAppearance();
  const miniMapControllerState = useNavigationMiniMap(
    context,
    miniMapAppearance,
  );
  const { controllerState, mapController } = useMapController(context, options);

  const navigationManager = useMemo<NavigationManager | null>(() => {
    const manager = new NavigationManager(context);
    // Remove the time/route-difference thresholds to make better-route
    // prompts easier to exercise in this demo.
    const settings = manager.alternativeRoutesProviderSettings;
    settings.betterRouteEnabled = true;
    settings.betterRouteTimeCostThreshold = Duration.ofSeconds(0);
    settings.betterRouteLengthThreshold = {
      millimeters: 0n,
    };
    return manager;
  }, [context]);
  const trafficRouter = useMemo<TrafficRouter | null>(
    () => new TrafficRouter(context),
    [context],
  );
  const objectManager = useMemo<MapObjectManager | null>(
    () => (mapController ? new MapObjectManager(mapController.map) : null),
    [mapController],
  );

  const [phase, setPhase] = useState<Phase>('selectStart');
  const [settings, setSettings] = useState(defaultNavigationDemoSettings);
  const [intermediatePointCount, setIntermediatePointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const startPointRef = useRef<GeoPoint | null>(null);
  const finishPointRef = useRef<GeoPoint | null>(null);
  const intermediatePointsRef = useRef<RouteSearchPointInit[]>([]);
  const markerGenerationRef = useRef(0);
  const routeSearchRef = useRef<Future<TrafficRoute[]> | null>(null);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const runRouteSearch = useLatestFuture();

  const imageLoaderRef = useRef<ImageLoader | null>(null);
  if (imageLoaderRef.current === null) {
    imageLoaderRef.current = new ImageLoader(context);
  }
  const imageCacheRef = useRef<DemoImageCache>(new Map());

  const addMarker = useCallback(
    (point: GeoPoint, type: NavigationPointMarkerType, label?: string) => {
      const loader = imageLoaderRef.current;
      if (!loader || !objectManager) {
        return;
      }

      const generation = markerGenerationRef.current;
      const image = loadNavigationPointMarkerImage(
        loader,
        imageCacheRef.current,
        type,
      );
      image
        .then(icon => {
          if (generation !== markerGenerationRef.current) {
            return;
          }
          objectManager.addObject(
            new Marker({
              position: {
                latitude: point.latitude,
                longitude: point.longitude,
              },
              icon,
              text: label,
              iconWidth: ROUTE_POINT_MARKER_WIDTH,
            }),
          );
        })
        .catch(iconError => {
          if (generation === markerGenerationRef.current) {
            setError(`Marker icon failed: ${String(iconError)}`);
          }
        });
    },
    [objectManager],
  );

  const clearMarkers = useCallback(() => {
    markerGenerationRef.current += 1;
    objectManager?.removeAll();
  }, [objectManager]);

  const reset = useCallback(() => {
    routeSearchRef.current = null;
    startPointRef.current = null;
    finishPointRef.current = null;
    intermediatePointsRef.current = [];
    setIntermediatePointCount(0);
    clearMarkers();
    changePhase('selectStart');
  }, [changePhase, clearMarkers]);

  useChannelEffect(
    () => mapController?.gestureRecognizer.longTouch,
    screenPoint => {
      const map = mapController?.map;
      const geoPoint = map?.camera.projection.screenToMap(screenPoint);
      if (!geoPoint) {
        return;
      }

      if (phaseRef.current === 'selectStart') {
        startPointRef.current = geoPoint;
        addMarker(geoPoint, 'start');
        setError(null);
        changePhase('selectFinish');
      } else if (phaseRef.current === 'selectFinish') {
        finishPointRef.current = geoPoint;
        addMarker(geoPoint, 'finish');
        changePhase('settings');
      }
    },
  );

  useChannelEffect(
    () => mapController?.gestureRecognizer.tap,
    screenPoint => {
      if (phaseRef.current !== 'selectFinish') {
        return;
      }
      const point =
        mapController?.map.camera.projection.screenToMap(screenPoint);
      if (!point) {
        return;
      }
      intermediatePointsRef.current.push({ coordinates: point });
      const count = intermediatePointsRef.current.length;
      addMarker(point, 'intermediate', String(count));
      setIntermediatePointCount(count);
    },
  );

  const startNavigation = useCallback(() => {
    const start = startPointRef.current;
    const finish = finishPointRef.current;
    const map = mapController?.map;
    if (
      phaseRef.current !== 'settings' ||
      !map ||
      !navigationManager ||
      !trafficRouter
    ) {
      return;
    }

    const failNavigation = (failure: unknown) => {
      navigationManager.stop();
      navigationManager.mapManager.removeMap(map);
      setError(`Navigation failed: ${String(failure)}`);
      changePhase('settings');
    };
    const attachMap = () => {
      navigationManager.mapManager.addMap(map);
      map.camera.setBehaviour(
        navigationManager.mapFollowController.cameraBehaviour,
      );
    };

    setError(null);
    try {
      navigationManager.exceedSpeedLimitSettings.allowableSpeedExcess =
        settings.allowableSpeedExcessKph / KPH_IN_MPS;
      const freeRoamSettings = navigationManager.freeRoamSettings;
      // Apply zero too, so a repeated run can disable previously enabled prefetching.
      freeRoamSettings.onRoutePrefetchLength = {
        millimeters: BigInt(settings.cacheDistanceOnRouteM) * 1000n,
      };
      freeRoamSettings.onRoutePrefetchRadiusMeters =
        settings.cacheRadiusOnRouteM;
      freeRoamSettings.prefetchRadiusMeters = settings.cacheRadiusM;

      if (settings.freeRoam) {
        attachMap();
        navigationManager.startFreeRoam();
        clearMarkers();
        changePhase('navigation');
        return;
      }
      if (!start || !finish) {
        setError('Select a start and finish on the map, or enable Free roam.');
        return;
      }

      const finishPoint = { coordinates: finish };
      const routeSearchOptions =
        settings.routeType === 'Pedestrian'
          ? RouteSearchOptions.pedestrian({})
          : settings.routeType === 'Bicycle'
          ? RouteSearchOptions.bicycle({})
          : RouteSearchOptions.car({});

      changePhase('searching');
      const search = trafficRouter.findRoute(
        { coordinates: start },
        finishPoint,
        routeSearchOptions,
        [...intermediatePointsRef.current],
      );
      routeSearchRef.current = search;
      runRouteSearch(
        search,
        routes => {
          if (routeSearchRef.current !== search) {
            return;
          }
          routeSearchRef.current = null;
          const route = routes[0];
          if (!route) {
            setError('Route not found');
            changePhase('settings');
            return;
          }

          try {
            const routeBuildOptions = {
              finishPoint,
              routeSearchOptions,
            };

            if (settings.useSimulation) {
              navigationManager.simulationSettings.speedMode =
                SimulationSpeedMode.speed({
                  speed: settings.speedKph / KPH_IN_MPS,
                });
            }

            attachMap();

            if (settings.useSimulation) {
              navigationManager.startSimulation(routeBuildOptions, route);
            } else {
              navigationManager.start(routeBuildOptions, route);
            }

            clearMarkers();
            changePhase('navigation');
          } catch (startError) {
            failNavigation(startError);
          }
        },
        searchError => {
          if (routeSearchRef.current !== search) {
            return;
          }
          routeSearchRef.current = null;
          setError(`Route search failed: ${String(searchError)}`);
          changePhase('settings');
        },
      );
    } catch (startError) {
      failNavigation(startError);
    }
  }, [
    changePhase,
    clearMarkers,
    mapController,
    navigationManager,
    runRouteSearch,
    settings,
    trafficRouter,
  ]);

  const stopNavigation = useCallback(() => {
    if (!navigationManager) {
      return;
    }

    navigationManager.stop();
    reset();
  }, [navigationManager, reset]);

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
      markerGenerationRef.current += 1;
      routeSearchRef.current = null;
      navigationManager?.stop();
      if (mapController) {
        navigationManager?.mapManager.removeMap(mapController.map);
      }
    };
  }, [navigationManager, mapController]);

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
          miniMapControllerState={miniMapControllerState.controllerState}
          onFinishRoutePress={handleFinishRoutePress}
        />
      )}

      {(phase === 'selectStart' ||
        phase === 'selectFinish' ||
        phase === 'searching') && (
        <View style={styles.mapPanel}>
          <Text style={styles.hint}>
            {phase === 'selectStart'
              ? 'Long press to select the start, or press Go? to set up free roam.'
              : phase === 'selectFinish'
              ? `Tap to add intermediate points (${intermediatePointCount}). Long press to select the finish.`
              : 'Searching route…'}
          </Text>
          {phase !== 'selectStart' && (
            <View style={styles.sheetActions}>
              {phase === 'searching' && (
                <ActivityIndicator color={colors.accent} />
              )}
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={reset}
              >
                <Text style={styles.secondaryButtonText}>
                  {phase === 'searching' ? 'Cancel search' : 'Reset points'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {(phase === 'selectStart' || phase === 'selectFinish') && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation settings"
          style={[
            styles.primaryButton,
            styles.goButton,
            { bottom: insets.bottom + spacing.xl },
          ]}
          onPress={() => {
            setError(null);
            changePhase('settings');
          }}
        >
          <Text style={styles.primaryButtonText}>Go?</Text>
        </Pressable>
      )}

      {error !== null && phase !== 'settings' && (
        <Text style={styles.error}>{error}</Text>
      )}
      {miniMapControllerState.controllerState.status === 'error' && (
        <Text style={styles.error}>
          Mini map: {miniMapControllerState.controllerState.error.message}
        </Text>
      )}

      <Modal
        visible={phase === 'settings'}
        transparent
        animationType="fade"
        onRequestClose={reset}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <Text style={styles.sheetTitle}>Navigation settings</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.settingsContent}
            >
              <Text style={styles.hint}>
                {startPointRef.current && finishPointRef.current
                  ? `Intermediate points: ${intermediatePointCount}`
                  : 'Select start and finish points on the map for route navigation.'}
              </Text>
              {phase === 'settings' && (
                <NavigationDemoSettingsForm
                  value={settings}
                  onChange={setSettings}
                />
              )}
              {error !== null && (
                <Text style={styles.settingsError}>{error}</Text>
              )}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={reset}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.primaryButton,
                  !settings.freeRoam &&
                    (!startPointRef.current || !finishPointRef.current) &&
                    styles.disabled,
                ]}
                disabled={
                  !settings.freeRoam &&
                  (!startPointRef.current || !finishPointRef.current)
                }
                onPress={startNavigation}
              >
                <Text style={styles.primaryButtonText}>Start</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  suspenseFallback: {
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
    maxHeight: '90%',
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
  settingsContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  settingsError: {
    color: colors.errorText,
    ...typography.caption,
  },
  mapPanel: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    ...typography.caption,
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
  goButton: {
    position: 'absolute',
    right: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textInverse,
    ...typography.body,
  },
});
