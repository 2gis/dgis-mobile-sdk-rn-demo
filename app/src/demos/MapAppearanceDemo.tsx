import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapView } from '@2gis/dgis-mobile-sdk-map';
import type { Map as SdkMap, MapController } from '@2gis/dgis-mobile-sdk-map';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useSdk } from '../sdk/useSdk';
import { destroyIfPresent } from '../hooks/nativeObjectLifecycle';
import {
  cardShadowElevated,
  colors,
  spacing,
  radius as themeRadius,
  typography,
} from '../theme/theme';
import { createMapAppearance, type MapThemeMode } from '../settings';

type AppearanceMode = MapThemeMode;

const APPEARANCE_OPTIONS: Array<{
  label: string;
  mode: AppearanceMode;
}> = [
  { label: 'System', mode: 'system' },
  { label: 'Light', mode: 'light' },
  { label: 'Dark', mode: 'dark' },
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

/** Demonstrates switching map appearance between system, light, and dark themes. */
export function MapAppearanceDemo() {
  const context = useSdk();
  const [mode, setMode] = useState<AppearanceMode>('system');
  const initialMapAppearance = useMemo(() => createMapAppearance('system'), []);
  const mapAppearance = useMemo(() => createMapAppearance(mode), [mode]);
  const options = useDefaultMapOptions(context, undefined, {
    mapAppearance: initialMapAppearance,
  });
  const { controllerState, mapController } = useMapController(context, options);

  useEffect(() => {
    if (!mapController) {
      return;
    }

    withControllerMap(mapController, map => {
      map.appearance = mapAppearance;
    });
  }, [mapAppearance, mapController]);

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      <View style={styles.controls}>
        <Text style={styles.title}>Appearance</Text>
        <View style={styles.segment}>
          {APPEARANCE_OPTIONS.map(option => {
            const isActive = option.mode === mode;
            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.segmentButton,
                  isActive && styles.segmentButtonActive,
                ]}
                onPress={() => setMode(option.mode)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controls: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    padding: spacing.md,
    ...cardShadowElevated,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: themeRadius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    ...typography.label,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.textInverse,
  },
});
