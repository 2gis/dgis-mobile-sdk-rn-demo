import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  CameraAnimationType,
  CameraPositionInit,
  Duration,
  MapView,
  MyLocationMapObjectMarkerType,
  MyLocationMapObjectSource,
} from '@2gis/dgis-mobile-sdk-full';
import type { Location, MapController } from '@2gis/dgis-mobile-sdk-full';

import { useSdk } from '../sdk/useSdk';
import { useChannelEffect } from '../hooks/useChannelEffect';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useFutures } from '../hooks/useFutures';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import {
  colors,
  radius as themeRadius,
  spacing,
  typography,
} from '../theme/theme';

interface CameraStep {
  position: CameraPositionInit;
  duration: Duration;
  animationType: CameraAnimationType;
}

function createCameraPositionFromLocation(
  location: Location,
): CameraPositionInit {
  return {
    point: location.coordinates.value,
    zoom: 16,
    tilt: 25,
  };
}

const CAMERA_STEPS: CameraStep[] = [
  {
    position: {
      point: {
        latitude: 55.759909,
        longitude: 37.618806,
      },
      zoom: 15,
      tilt: 15,
      bearing: 115,
    },
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Linear,
  },
  {
    position: {
      point: {
        latitude: 55.759909,
        longitude: 37.618806,
      },
      zoom: 16,
      tilt: 15,
    },
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Default,
  },
  {
    position: {
      point: {
        latitude: 55.746962,
        longitude: 37.643073,
      },
      zoom: 16,
      tilt: 55,
    },
    duration: Duration.ofSeconds(9),
    animationType: CameraAnimationType.ShowBothPositions,
  },
  {
    position: {
      point: {
        latitude: 55.746962,
        longitude: 37.643073,
      },
      zoom: 16.5,
      tilt: 45,
      bearing: 40,
    },
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Linear,
  },
  {
    position: {
      point: {
        latitude: 55.752425,
        longitude: 37.613983,
      },
      zoom: 16,
      tilt: 25,
      bearing: 85,
    },
    duration: Duration.ofSeconds(4),
    animationType: CameraAnimationType.Default,
  },
];

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

  const myLocationSource = useMemo<MyLocationMapObjectSource | null>(
    () =>
      new MyLocationMapObjectSource(
        context,
        {},
        MyLocationMapObjectMarkerType.Model,
      ),
    [context],
  );

  useEffect(() => {
    if (!mapController || !myLocationSource) {
      return;
    }

    const map = mapController.map;
    map.addSource(myLocationSource);

    return () => {
      map.removeSource(myLocationSource);
    };
  }, [mapController, myLocationSource]);

  const moveSequentially = useCallback(
    (controller: MapController, index: number) => {
      if (index >= CAMERA_STEPS.length) {
        setMoving(false);
        return;
      }

      const { position, duration, animationType } = CAMERA_STEPS[index]!;

      const future = controller.map.camera.moveToCameraPosition(
        position,
        duration,
        animationType,
      );

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
      const future = controller.map.camera.moveToCameraPosition(
        createCameraPositionFromLocation(location),
        Duration.ofSeconds(2),
        CameraAnimationType.Default,
      );

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
