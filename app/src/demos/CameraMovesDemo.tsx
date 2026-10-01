import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Bearing,
  CameraAnimationType,
  CameraPosition,
  Duration,
  GeoPoint,
  MapView,
  MyLocationControllerSettings,
  MyLocationMapObjectMarkerType,
  MyLocationMapObjectSource,
  Tilt,
  Zoom,
} from '@2gis/dgis-mobile-sdk-map';
import type {
  Camera as SdkCamera,
  Location,
  Map as SdkMap,
  MapController,
} from '@2gis/dgis-mobile-sdk-map';

import { useSdk } from '../sdk/useSdk';
import { useChannelEffect } from '../hooks/useChannelEffect';
import {
  destroyIfPresent,
  isNativeDestroyedError,
} from '../hooks/nativeObjectLifecycle';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useFutures } from '../hooks/useFutures';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { useNative } from '../hooks/useNative';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import {
  colors,
  radius as themeRadius,
  spacing,
  typography,
} from '../theme/theme';

interface CameraStep {
  position: CameraPosition;
  duration: Duration;
  animationType: CameraAnimationType;
}

function createCameraPositionFromLocation(location: Location): CameraPosition {
  return new CameraPosition({
    point: location.coordinates.value,
    zoom: new Zoom({ value: 16 }),
    tilt: new Tilt({ value: 25 }),
  });
}

const CAMERA_STEPS: CameraStep[] = [
  {
    position: new CameraPosition({
      point: new GeoPoint({
        latitude: { value: 55.759909 },
        longitude: { value: 37.618806 },
      }),
      zoom: new Zoom({ value: 15 }),
      tilt: new Tilt({ value: 15 }),
      bearing: new Bearing({ value: 115 }),
    }),
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Linear,
  },
  {
    position: new CameraPosition({
      point: new GeoPoint({
        latitude: { value: 55.759909 },
        longitude: { value: 37.618806 },
      }),
      zoom: new Zoom({ value: 16 }),
      tilt: new Tilt({ value: 15 }),
    }),
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Default,
  },
  {
    position: new CameraPosition({
      point: new GeoPoint({
        latitude: { value: 55.746962 },
        longitude: { value: 37.643073 },
      }),
      zoom: new Zoom({ value: 16 }),
      tilt: new Tilt({ value: 55 }),
    }),
    duration: Duration.ofSeconds(9),
    animationType: CameraAnimationType.ShowBothPositions,
  },
  {
    position: new CameraPosition({
      point: new GeoPoint({
        latitude: { value: 55.746962 },
        longitude: { value: 37.643073 },
      }),
      zoom: new Zoom({ value: 16.5 }),
      tilt: new Tilt({ value: 45 }),
      bearing: new Bearing({ value: 40 }),
    }),
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Linear,
  },
  {
    position: new CameraPosition({
      point: new GeoPoint({
        latitude: { value: 55.752425 },
        longitude: { value: 37.613983 },
      }),
      zoom: new Zoom({ value: 16 }),
      tilt: new Tilt({ value: 25 }),
      bearing: new Bearing({ value: 85 }),
    }),
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Default,
  },
];

function withControllerMap<T>(
  controller: MapController,
  action: (map: SdkMap) => T,
): T {
  const map = controller.map;
  try {
    return action(map);
  } finally {
    destroyIfPresent(map);
  }
}

function withMapCamera<T>(map: SdkMap, action: (camera: SdkCamera) => T): T {
  const camera = map.camera;
  try {
    return action(camera);
  } finally {
    destroyIfPresent(camera);
  }
}

/**
 * Demonstrates sequential camera animation through a list of positions with
 * different animation types. The pending future is cleaned up on unmount via
 * useFutures.
 */
export function CameraMovesDemo() {
  const context = useSdk();
  const locationService = useInitializeLocationService();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const [moving, setMoving] = useState(false);
  const [followingCurrentPosition, setFollowingCurrentPosition] =
    useState(false);
  const runFuture = useFutures();
  const runLatestFuture = useLatestFuture();

  const myLocationSource = useNative<MyLocationMapObjectSource>(
    () =>
      new MyLocationMapObjectSource(
        context,
        new MyLocationControllerSettings({}),
        MyLocationMapObjectMarkerType.Model,
      ),
    [context],
  );

  useEffect(() => {
    if (!mapController || !myLocationSource) {
      return;
    }

    const map = mapController.map;
    try {
      map.addSource(myLocationSource);
    } catch (error) {
      destroyIfPresent(map);
      throw error;
    }

    return () => {
      try {
        map.removeSource(myLocationSource);
      } catch (error) {
        if (!isNativeDestroyedError(error)) {
          throw error;
        }
      } finally {
        destroyIfPresent(map);
      }
    };
  }, [mapController, myLocationSource]);

  const moveSequentially = useCallback(
    (controller: MapController, index: number) => {
      if (index >= CAMERA_STEPS.length) {
        setMoving(false);
        return;
      }

      const { position, duration, animationType } = CAMERA_STEPS[index]!;

      let future;
      try {
        future = withControllerMap(controller, map =>
          withMapCamera(map, camera =>
            camera.moveToCameraPosition(position, duration, animationType),
          ),
        );
      } catch (error) {
        if (isNativeDestroyedError(error)) {
          return;
        }
        throw error;
      }

      runFuture(
        future,
        () => moveSequentially(controller, index + 1),
        () => setMoving(false),
      );
    },
    [runFuture],
  );

  const moveToCurrentPosition = useCallback(
    (controller: MapController, location: Location) => {
      let future;
      try {
        future = withControllerMap(controller, map =>
          withMapCamera(map, camera =>
            camera.moveToCameraPosition(
              createCameraPositionFromLocation(location),
              Duration.ofSeconds(2),
              CameraAnimationType.Default,
            ),
          ),
        );
      } catch (error) {
        if (isNativeDestroyedError(error)) {
          return;
        }
        throw error;
      }

      runLatestFuture(
        future,
        () => {},
        (error: unknown) => {
          console.warn('Failed to move camera to current position:', error);
        },
      );
    },
    [runLatestFuture],
  );

  useChannelEffect(
    () =>
      followingCurrentPosition ? locationService?.lastLocationChannel : null,
    location => {
      if (!mapController || !location) {
        return;
      }

      moveToCurrentPosition(mapController, location);
    },
    [
      followingCurrentPosition,
      locationService,
      mapController,
      moveToCurrentPosition,
    ],
  );

  const handleStart = useCallback(() => {
    if (!mapController || moving) return;
    setFollowingCurrentPosition(false);
    setMoving(true);
    moveSequentially(mapController, 0);
  }, [mapController, moving, moveSequentially]);

  const handleMoveToCurrentPosition = useCallback(() => {
    if (moving || !locationService) {
      return;
    }

    const nextFollowingState = !followingCurrentPosition;
    setFollowingCurrentPosition(nextFollowingState);

    if (!nextFollowingState || !mapController) {
      return;
    }

    const currentLocation = locationService.lastLocationChannel.value;
    if (currentLocation) {
      moveToCurrentPosition(mapController, currentLocation);
    }
  }, [
    followingCurrentPosition,
    locationService,
    mapController,
    moveToCurrentPosition,
    moving,
  ]);

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, moving && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={moving}
        >
          <Text style={styles.buttonText}>
            {moving ? 'Moving...' : 'Move camera around Moscow'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            (moving || !locationService) && styles.buttonDisabled,
          ]}
          onPress={handleMoveToCurrentPosition}
          disabled={moving || !locationService}
        >
          <Text style={styles.buttonText}>
            {followingCurrentPosition
              ? 'Stop moving to current position'
              : 'Move to current position'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controls: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.header,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: themeRadius.sm,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
