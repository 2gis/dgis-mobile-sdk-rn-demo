import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraPosition, Duration, MapView } from '@2gis/dgis-mobile-sdk-full';
import type { CameraMoveController } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useChannelValue } from '../hooks/useChannelValue';
import { useLatestFuture } from '../hooks/useLatestFuture';
import {
  cardShadow,
  colors,
  radius as themeRadius,
  spacing,
  typography,
} from '../theme/theme';

/**
 * Demonstrates FPS monitoring and configuration. Shows the live FPS counter via
 * useChannelValue; provides inputs to adjust max FPS and power-saving max FPS;
 * a toggle starts/stops continuous camera oscillation to generate load.
 */
export function FpsDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const renderer = mapController?.renderer ?? null;

  const currentFps = useChannelValue(() => renderer?.fpsChannel, 0);

  const [isAnimating, setIsAnimating] = useState(false);
  const [maxFpsText, setMaxFpsText] = useState('');
  const [psMaxFpsText, setPsMaxFpsText] = useState('');
  const runFuture = useLatestFuture();

  useEffect(() => {
    if (!renderer) {
      return;
    }

    const initialMaxFps = renderer.maxFps;
    const initialPsMaxFps = renderer.powerSavingMaxFps;

    if (initialMaxFps != null) {
      setMaxFpsText(current =>
        current === '' ? String(initialMaxFps) : current,
      );
    }
    if (initialPsMaxFps != null) {
      setPsMaxFpsText(current =>
        current === '' ? String(initialPsMaxFps) : current,
      );
    }
  }, [renderer]);

  const applyMaxFps = () => {
    Keyboard.dismiss();
    if (!renderer) return;
    const parsed = parseInt(maxFpsText, 10);
    if (isNaN(parsed)) return;
    renderer.setMaxFps(parsed, renderer.powerSavingMaxFps);
  };

  const applyPsMaxFps = () => {
    Keyboard.dismiss();
    if (!renderer) return;
    const parsed = parseInt(psMaxFpsText, 10);
    if (isNaN(parsed)) return;
    renderer.setMaxFps(renderer.maxFps, parsed);
  };

  const toggleAnimation = () => {
    if (!mapController) return;

    if (!isAnimating) {
      const initialPosition = mapController.map.camera.position;
      const moveController: CameraMoveController = {
        position(time: Duration): CameraPosition {
          const offset = Math.sin(time.milliseconds * 0.001);
          return {
            point: {
              latitude: initialPosition.point.latitude,
              longitude: initialPosition.point.longitude,
            },
            zoom: Math.max(0, initialPosition.zoom + offset),
            tilt: initialPosition.tilt,
            bearing: initialPosition.bearing,
          };
        },
        animationTime(): Duration {
          return Duration.ofSeconds(100);
        },
      };

      const future =
        mapController.map.camera.moveWithController(moveController);
      runFuture(
        future,
        () => setIsAnimating(false),
        () => setIsAnimating(false),
      );
      setIsAnimating(true);
    } else {
      mapController.map.camera.processMovementAndStop();
      setIsAnimating(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      <View style={styles.inputsPanel}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputWithButton]}
            value={maxFpsText}
            onChangeText={setMaxFpsText}
            placeholder="Max fps"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={applyMaxFps}
          />
          <TouchableOpacity style={styles.applyButton} onPress={applyMaxFps}>
            <Text style={styles.applyButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputWithButton]}
            value={psMaxFpsText}
            onChangeText={setPsMaxFpsText}
            placeholder="PS max fps"
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={applyPsMaxFps}
          />
          <TouchableOpacity style={styles.applyButton} onPress={applyPsMaxFps}>
            <Text style={styles.applyButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={toggleAnimation}
        style={[styles.fpsButton, isAnimating && styles.fpsButtonActive]}
      >
        <Text style={styles.fpsButtonText}>FPS: {currentFps}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  inputsPanel: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 150,
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    ...typography.caption,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inputWithButton: {
    flex: 1,
  },
  applyButton: {
    width: 28,
    height: 28,
    borderRadius: themeRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.divider,
  },
  applyButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
  },

  fpsButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 88,
    height: 88,
    borderRadius: themeRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.divider,
    ...cardShadow,
  },
  fpsButtonActive: {
    backgroundColor: colors.surface,
  },
  fpsButtonText: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
