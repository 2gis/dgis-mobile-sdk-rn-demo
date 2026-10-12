import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bearing,
  CameraFollowState,
  CompassControlModel,
  IndoorControlModel,
  MapView,
  MyLocationControlModel,
  MyLocationControllerSettings,
  MyLocationMapObjectMarkerType,
  MyLocationMapObjectSource,
  TrafficControlModel,
  TrafficControlStatus,
  ZoomControlButton,
  ZoomControlModel,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  LocationQuality,
  Map as SdkMap,
  MapController,
  TrafficControlState,
} from '@2gis/dgis-mobile-sdk-full';

import { useSdk } from '../sdk/useSdk';
import { useChannelValue } from '../hooks/useChannelValue';
import {
  destroyIfPresent,
  isNativeDestroyedError,
} from '../hooks/nativeObjectLifecycle';
import { useNative } from '../hooks/useNative';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import { checkLocationPermissions } from '../sdk/locationPermissions';
import {
  cardShadow,
  colors,
  radius as themeRadius,
  spacing,
} from '../theme/theme';

function normalizeDegrees(value: number): number {
  const n = value % 360;
  return n < 0 ? n + 360 : n;
}

function followStateLabel(state: CameraFollowState): string {
  switch (state) {
    case CameraFollowState.FollowPosition:
      return 'Follow position';
    case CameraFollowState.FollowDirection:
      return 'Follow direction';
    case CameraFollowState.Off:
    default:
      return 'Off';
  }
}

interface ControlModelResources {
  map: SdkMap;
  zoomModel: ZoomControlModel;
  compassModel: CompassControlModel;
  myLocationModel: MyLocationControlModel;
  trafficModel: TrafficControlModel;
  indoorModel: IndoorControlModel;
  destroy(): void;
}

function createControlModelResources(
  controller: MapController,
): ControlModelResources {
  const map = controller.map;
  const zoomModel = new ZoomControlModel(map);
  const compassModel = new CompassControlModel(map);
  const myLocationModel = new MyLocationControlModel(map);
  const trafficModel = new TrafficControlModel(map);
  const indoorModel = new IndoorControlModel(map);

  return {
    map,
    zoomModel,
    compassModel,
    myLocationModel,
    trafficModel,
    indoorModel,
    destroy() {
      destroyIfPresent(indoorModel);
      destroyIfPresent(trafficModel);
      destroyIfPresent(myLocationModel);
      destroyIfPresent(compassModel);
      destroyIfPresent(zoomModel);
      destroyIfPresent(map);
    },
  };
}

/**
 * Demonstrates all built-in map controls: zoom, compass, my-location, traffic,
 * and indoor level picker — each backed by its SDK control model.
 */
export function AllMapControlsDemo() {
  const context = useSdk();
  const locationService = useInitializeLocationService(false);
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const controlResources = useNative<ControlModelResources>(
    () => (mapController ? createControlModelResources(mapController) : null),
    [mapController],
  );
  const map = controlResources?.map ?? null;
  const zoomModel = controlResources?.zoomModel ?? null;
  const compassModel = controlResources?.compassModel ?? null;
  const myLocationModel = controlResources?.myLocationModel ?? null;
  const trafficModel = controlResources?.trafficModel ?? null;
  const indoorModel = controlResources?.indoorModel ?? null;
  const myLocationSource = useNative<MyLocationMapObjectSource>(
    () =>
      new MyLocationMapObjectSource(
        context,
        new MyLocationControllerSettings({}),
        MyLocationMapObjectMarkerType.Model,
      ),
    [context],
  );

  const zoomInEnabled = useChannelValue(
    () => zoomModel?.isEnabled(ZoomControlButton.ZoomIn),
    true,
    [zoomModel],
  );
  const zoomOutEnabled = useChannelValue(
    () => zoomModel?.isEnabled(ZoomControlButton.ZoomOut),
    true,
    [zoomModel],
  );
  const compassBearing = useChannelValue(
    () => compassModel?.bearingChannel,
    new Bearing({ value: 0 }),
    [compassModel],
  ).value;
  const myLocationEnabled = useChannelValue(
    () => myLocationModel?.isEnabledChannel,
    false,
    [myLocationModel],
  );
  const followState = useChannelValue(
    () => myLocationModel?.followStateChannel,
    CameraFollowState.Off,
    [myLocationModel],
  );
  const locationQuality = useChannelValue<LocationQuality | null>(
    () => myLocationModel?.locationQualityChannel,
    null,
    [myLocationModel],
  );
  const trafficState = useChannelValue<TrafficControlState | null>(
    () => trafficModel?.stateChannel,
    null,
    [trafficModel],
  );
  const levelNames = useChannelValue<string[]>(
    () => indoorModel?.levelNamesChannel,
    [],
    [indoorModel],
  );
  const activeLevelIndex = useChannelValue<bigint | null>(
    () => indoorModel?.activeLevelIndexChannel,
    null,
    [indoorModel],
  );

  useEffect(() => {
    if (!map || !myLocationSource) {
      return;
    }

    map.addSource(myLocationSource);

    return () => {
      try {
        map.removeSource(myLocationSource);
      } catch (error) {
        if (!isNativeDestroyedError(error)) {
          throw error;
        }
      }
    };
  }, [map, myLocationSource]);

  const handleZoomPressIn = (button: ZoomControlButton) => {
    zoomModel?.setPressed(button, true);
  };

  const handleZoomPressOut = (button: ZoomControlButton) => {
    zoomModel?.setPressed(button, false);
  };

  const handleCompassPress = () => {
    compassModel?.onClicked();
  };

  const handleTrafficPress = () => {
    trafficModel?.onClicked();
  };

  const handleMyLocationPress = () => {
    if (!myLocationSource || !locationService || !myLocationModel) {
      return;
    }

    checkLocationPermissions(locationService)
      .then(granted => {
        if (granted) {
          myLocationModel.onClicked();
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to check location permissions:', error);
      });
  };

  const handleIndoorLevelPress = (index: number) => {
    if (!indoorModel) {
      return;
    }

    const nextIndex = BigInt(index);
    indoorModel.activeLevelIndex =
      activeLevelIndex === nextIndex ? null : nextIndex;
  };

  const normalizedBearing = normalizeDegrees(compassBearing);
  const showCompass = normalizedBearing > 1 && normalizedBearing < 359;

  const showTraffic =
    trafficState != null && trafficState.status !== TrafficControlStatus.Hidden;
  const trafficLabel =
    trafficState?.score == null ? 'Traffic' : String(trafficState.score);
  const trafficEnabled =
    trafficState?.status === TrafficControlStatus.Enabled ||
    trafficState?.status === TrafficControlStatus.Loading;

  const myLocationStateText =
    locationQuality == null
      ? followStateLabel(followState)
      : `${followStateLabel(followState)} · ${
          locationQuality === 0 ? 'Accurate' : 'Degraded'
        }`;

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      <View style={styles.contentPadding}>
        {showTraffic && (
          <View style={styles.topRightRow}>
            <Pressable
              style={[
                styles.trafficButton,
                trafficEnabled && styles.trafficButtonEnabled,
              ]}
              onPress={handleTrafficPress}
            >
              <Text
                style={[
                  styles.trafficButtonText,
                  trafficEnabled && styles.trafficButtonTextEnabled,
                ]}
              >
                {trafficLabel}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.centerRightColumn}>
          <View style={styles.zoomContainer}>
            <Pressable
              disabled={!zoomInEnabled}
              style={[
                styles.controlButton,
                !zoomInEnabled && styles.controlDisabled,
              ]}
              onPressIn={() => handleZoomPressIn(ZoomControlButton.ZoomIn)}
              onPressOut={() => handleZoomPressOut(ZoomControlButton.ZoomIn)}
            >
              <Text style={styles.controlButtonText}>+</Text>
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable
              disabled={!zoomOutEnabled}
              style={[
                styles.controlButton,
                !zoomOutEnabled && styles.controlDisabled,
              ]}
              onPressIn={() => handleZoomPressIn(ZoomControlButton.ZoomOut)}
              onPressOut={() => handleZoomPressOut(ZoomControlButton.ZoomOut)}
            >
              <Text style={styles.controlButtonText}>-</Text>
            </Pressable>
          </View>

          {showCompass && (
            <Pressable style={styles.roundButton} onPress={handleCompassPress}>
              <Text style={styles.roundButtonText}>N</Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.roundButton,
              !myLocationEnabled && styles.controlDisabled,
            ]}
            onPress={handleMyLocationPress}
          >
            <Text style={styles.roundButtonText}>◎</Text>
          </Pressable>
        </View>

        {levelNames.length > 0 && (
          <View style={styles.centerLeftColumn}>
            <View style={styles.indoorCard}>
              {levelNames.map((name, index) => {
                const active = activeLevelIndex === BigInt(index);
                return (
                  <Pressable
                    key={`${name}-${index}`}
                    style={[
                      styles.floorButton,
                      active && styles.floorButtonActive,
                    ]}
                    onPress={() => handleIndoorLevelPress(index)}
                  >
                    <Text
                      style={[
                        styles.floorButtonText,
                        active && styles.floorButtonTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomInfo}>
          <Text style={styles.bottomInfoText}>{myLocationStateText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  contentPadding: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  topRightRow: {
    alignItems: 'flex-end',
  },
  trafficButton: {
    minWidth: 50,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  trafficButtonEnabled: {
    borderColor: '#f57c00',
    backgroundColor: '#fff3e0',
  },
  trafficButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  trafficButtonTextEnabled: {
    color: '#e65100',
  },

  centerRightColumn: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: [{ translateY: -80 }],
    alignItems: 'center',
    gap: spacing.sm,
  },
  zoomContainer: {
    width: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  controlButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadow,
  },
  roundButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  controlDisabled: {
    opacity: 0.45,
  },

  centerLeftColumn: {
    position: 'absolute',
    left: spacing.sm,
    top: '50%',
    transform: [{ translateY: -90 }],
  },
  indoorCard: {
    borderRadius: themeRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  floorButton: {
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  floorButtonActive: {
    backgroundColor: colors.header,
  },
  floorButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  floorButtonTextActive: {
    color: colors.textInverse,
  },

  bottomInfo: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: themeRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bottomInfoText: {
    color: colors.textInverse,
    fontSize: 12,
    textAlign: 'center',
  },
});
