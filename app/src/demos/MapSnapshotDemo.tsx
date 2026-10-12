import React, { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alignment, MapView } from '@2gis/dgis-mobile-sdk-full';
import type { MapRenderer } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { useNative } from '../hooks/useNative';
import {
  colors,
  radius as themeRadius,
  spacing,
  typography,
} from '../theme/theme';

/** Takes a snapshot of the map and shows it below. */
export function MapSnapshotDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const renderer = useNative<MapRenderer>(
    () => mapController?.renderer ?? null,
    [mapController],
  );

  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(300);
  const [errorText, setErrorText] = useState<string | null>(null);
  const runFuture = useLatestFuture();

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setMapHeight(e.nativeEvent.layout.height / 2 - 50);
  }, []);

  const takeSnapshot = useCallback(() => {
    if (!renderer) return;

    runFuture(
      renderer.takeSnapshotAsDataUri(Alignment.TopLeft),
      uri => {
        if (!uri) {
          setErrorText('Unsupported snapshot format');
          return;
        }
        setErrorText(null);
        setSnapshotUri(uri);
      },
      error => setErrorText(String(error)),
    );
  }, [renderer, runFuture]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <MapView controllerState={controllerState} style={styles.map} />
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.button} onPress={takeSnapshot}>
          <Text style={styles.buttonText}>Take snapshot</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.snapshotContainer, { height: mapHeight }]}>
        {snapshotUri ? (
          <Image
            source={{ uri: snapshotUri }}
            style={styles.snapshotImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.placeholderText}>Snapshot will appear here</Text>
        )}
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { width: '100%' },
  map: { flex: 1 },
  controlsRow: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: colors.surface,
    borderColor: colors.header,
    borderWidth: 1,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.header,
  },
  snapshotContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  snapshotImage: { width: '100%', height: '100%' },
  placeholderText: {
    ...typography.label,
    color: colors.textMuted,
  },
  errorText: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    ...typography.small,
    color: colors.errorText,
    textAlign: 'center',
  },
});
