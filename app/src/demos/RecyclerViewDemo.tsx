import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  CameraPosition,
  DgisSource,
  GeoPoint,
  MapController,
  MapControllerOptions,
  MapView,
  readyMapController,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Context,
  Map as SdkMap,
  Source,
} from '@2gis/dgis-mobile-sdk-full';
import {
  useDefaultMapAppearance,
  useDefaultMapSettings,
} from '../hooks/useDefaultMapOptions';
import { useSdk } from '../sdk/useSdk';
import {
  createDgisSourceWorkingModeFromSettings,
  createGraphicsPresetFromSettings,
  createMapStyleFileFromSettings,
} from '../settings';
import { spacing } from '../theme/theme';
import { destroyAll, destroyIfPresent } from './demoNativeCleanup';

interface MapState {
  id: string;
  position: CameraPosition;
}

const CITIES = [
  { lat: 55.753256, lon: 37.619333 },
  { lat: 59.885893, lon: 30.34558 },
  { lat: 55.032924, lon: 82.953306 },
];

// Seeded random matching the native RecyclerViewActivity.
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 0x80000000;
    return s / 0x80000000;
  };
}

function generateStates(count: number): MapState[] {
  const rng = seededRandom(123);
  const result: MapState[] = [];
  for (let i = 0; i < count; i++) {
    const city = CITIES[i % 3];
    const lat = city.lat + (rng() * 0.2 - 0.1);
    const lon = city.lon + (rng() * 0.2 - 0.1);
    const zoom = 9 + rng() * 5;
    result.push({
      id: String(i),
      position: new CameraPosition({
        point: new GeoPoint({
          latitude: { value: lat },
          longitude: { value: lon },
        }),
        zoom: { value: zoom },
      }),
    });
  }
  return result;
}

const MAP_STATES = generateStates(100);

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

/** A single map cell, created once and rebound when the list recycles it. */
function MapCell({ context, state }: { context: Context; state: MapState }) {
  const [controller, setController] = useState<MapController | null>(null);
  const mapSettings = useDefaultMapSettings();
  const mapAppearance = useDefaultMapAppearance();
  const sourceWorkingMode =
    createDgisSourceWorkingModeFromSettings(mapSettings);
  const graphicsPreset = createGraphicsPresetFromSettings(mapSettings);
  const styleFile = useMemo(
    () => createMapStyleFileFromSettings(mapSettings),
    [mapSettings],
  );

  // Create the controller once per cell mount.
  useEffect(() => {
    let cancelled = false;
    let ctrl: MapController | null = null;
    const sources: Source[] = [
      DgisSource.createDgisSource(context, sourceWorkingMode),
      DgisSource.createImmersiveDgisSource(context),
    ];
    const future = MapController.create(
      context,
      new MapControllerOptions({
        position: state.position,
        sources,
        graphicsPreset,
        mapAppearance,
        styleFile,
      }),
    );
    future.onComplete(
      created => {
        if (cancelled) {
          created.destroy();
          return;
        }
        withControllerMap(created, map => {
          map.appearance = mapAppearance;
          map.graphicsPreset = graphicsPreset;
          map.interactive = false;
        });
        ctrl = created;
        setController(created);
      },
      () => {},
    );
    return () => {
      cancelled = true;
      future.destroy();
      ctrl?.destroy();
      destroyAll(sources);
    };
    // state.position is the initial position; camera updates happen below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, graphicsPreset, mapAppearance, sourceWorkingMode, styleFile]);

  // When the state changes (cell recycled), move the camera.
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (!controller || prevStateRef.current === state) return;
    prevStateRef.current = state;
    withControllerMap(controller, map => {
      const camera = map.camera;
      try {
        camera.position = state.position;
      } finally {
        destroyIfPresent(camera);
      }
    });
  }, [controller, state]);

  if (!controller) {
    return <View style={styles.cell} />;
  }

  return (
    <View style={styles.cell}>
      <MapView
        controllerState={readyMapController(controller)}
        renderMode="texture"
        style={styles.map}
      />
    </View>
  );
}

/**
 * Multiple maps in a scrollable list — demonstrates TextureView rendering mode
 * that allows maps inside ScrollView/FlatList (SurfaceView has z-ordering issues).
 *
 * Mirrors the native Android RecyclerViewActivity.
 */
export function RecyclerViewDemo() {
  const context = useSdk();

  return (
    <FlatList
      data={MAP_STATES}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <MapCell context={context} state={item} />}
      style={styles.list}
      // Keep fewer off-screen cells to limit GPU memory.
      windowSize={3}
      maxToRenderPerBatch={2}
      initialNumToRender={3}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  cell: {
    height: 200,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  map: { flex: 1 },
});
