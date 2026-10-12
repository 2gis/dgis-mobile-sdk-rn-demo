import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MapView,
  MyLocationControllerSettings,
  MyLocationMapObjectMarkerType,
  MyLocationMapObjectSource,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import { useNative } from '../hooks/useNative';
import {
  destroyIfPresent,
  isNativeDestroyedError,
} from '../hooks/nativeObjectLifecycle';

/** Minimal map demo — shows the map with default options and nothing else. */
export function MapDemo() {
  const context = useSdk();

  // Init LocationService and request permissions. Must be called at the top level, like any hook.
  useInitializeLocationService();

  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

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
