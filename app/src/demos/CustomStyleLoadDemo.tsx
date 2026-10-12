import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraPosition, GeoPoint, MapView } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';

const INITIAL_POSITION = new CameraPosition({
  point: new GeoPoint({
    latitude: { value: 55.752474 },
    longitude: { value: 37.668906 },
  }),
  zoom: { value: 11 },
});

// Stable overrides reference so useDefaultMapOptions memoizes — a fresh object
// literal each render would recreate the options and, through useMapController,
// the map itself on every render.
const MAP_OPTIONS_OVERRIDES = { position: INITIAL_POSITION };

export function CustomStyleLoadDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context, MAP_OPTIONS_OVERRIDES);
  const { controllerState } = useMapController(context, options);

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
