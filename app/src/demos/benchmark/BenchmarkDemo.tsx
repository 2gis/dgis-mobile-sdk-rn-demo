import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CameraPosition,
  GeometryMapObjectSourceBuilder,
  GeoPoint,
  MapObjectManager,
  MapView,
  Polygon,
  parseGeoJson,
  Zoom,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Camera as SdkCamera,
  Connection,
  Fps,
  Future,
  CameraAnimatedMoveResult,
  GeometryMapObject,
  GeometryMapObjectSource,
  Map as SdkMap,
  MapController,
  MapRenderer,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../../sdk/useSdk';
import { useDefaultMapOptions } from '../../hooks/useDefaultMapOptions';
import { useMapController } from '../../hooks/useMapController';
import { colors, radius as themeRadius, spacing } from '../../theme/theme';
import {
  destroyAll,
  destroyIfPresent,
  ignoreNativeDestroyedError,
  isNativeDestroyedError,
  type Destroyable,
} from '../demoNativeCleanup';
import { CAMERA_PATHS } from './cameraPaths';
import type { CameraPath, CameraPathEntry } from './cameraPaths';
import { BENCHMARK_POLYGONS } from './benchmarkPolygons';
const moscowGeoJsonRaw: object = require('./moscow_geo_json.json');

// ── Stats helpers ───────────────────────────────────────────────────────────

function computeStats(values: number[]) {
  if (values.length === 0) return { avg: 0, p1: 0, p01: 0 };
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const p1Idx = Math.max(0, Math.ceil(0.01 * sorted.length) - 1);
  const p01Idx = Math.max(0, Math.ceil(0.001 * sorted.length) - 1);
  return { avg, p1: sorted[p1Idx]!, p01: sorted[p01Idx]! };
}

// ── FPS accumulator hook ────────────────────────────────────────────────────
// Accumulates values in a mutable ref from the SDK channel callback.
// Syncs to React state via setInterval (more predictable than RAF in RN).
// Also polls fpsChannel.value between channel events so intermediate
// readings are captured even when the channel fires infrequently.

const SYNC_INTERVAL_MS = 100;

function useFpsAccumulator() {
  const bufferRef = useRef<number[]>([]);
  const lastRef = useRef(0);
  const [snapshot, setSnapshot] = useState<{ values: number[]; last: number }>({
    values: [],
    last: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revRef = useRef(0); // bumped on every push to detect new data

  const start = useCallback(() => {
    bufferRef.current = [];
    lastRef.current = 0;
    revRef.current = 0;
    setSnapshot({ values: [], last: 0 });

    if (intervalRef.current != null) clearInterval(intervalRef.current);
    let lastSyncedRev = -1;
    intervalRef.current = setInterval(() => {
      const rev = revRef.current;
      if (rev !== lastSyncedRev) {
        lastSyncedRev = rev;
        setSnapshot({ values: [...bufferRef.current], last: lastRef.current });
      }
    }, SYNC_INTERVAL_MS);
  }, []);

  const push = useCallback((v: number) => {
    bufferRef.current.push(v);
    lastRef.current = v;
    revRef.current++;
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { snapshot, start, push, stop };
}

// ── Main component ──────────────────────────────────────────────────────────

const GRAPH_HEIGHT = 100;
const MAX_FPS = 120;

interface MapObjectManagerResources {
  manager: MapObjectManager;
  map: SdkMap;
}

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
 * FPS benchmark: runs predefined camera animation paths (with optional polygon
 * / GeoJSON objects on the map) and shows a real-time FPS graph with avg/p1/p0.1.
 */
export function BenchmarkDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const [running, setRunning] = useState(false);
  const {
    snapshot: fpsSnapshot,
    start: startFps,
    push: pushFps,
    stop: stopFps,
  } = useFpsAccumulator();

  const fpsConnectionRef = useRef<Connection | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const moveFutureRef = useRef<Future<CameraAnimatedMoveResult> | null>(null);
  const mapObjectManagerRef = useRef<MapObjectManagerResources | null>(null);
  const mapObjectsRef = useRef<Destroyable[]>([]);
  const geometrySourceRef = useRef<GeometryMapObjectSource | null>(null);
  const geometryObjectsRef = useRef<GeometryMapObject[]>([]);

  const cleanupObjects = useCallback((controller: MapController) => {
    const managerResources = mapObjectManagerRef.current;
    if (managerResources) {
      ignoreNativeDestroyedError(() => managerResources.manager.removeAll());
      destroyAll(mapObjectsRef.current);
      mapObjectsRef.current = [];
      ignoreNativeDestroyedError(() =>
        destroyIfPresent(managerResources.manager),
      );
      ignoreNativeDestroyedError(() => destroyIfPresent(managerResources.map));
      mapObjectManagerRef.current = null;
    }
    if (geometrySourceRef.current) {
      const source = geometrySourceRef.current;
      ignoreNativeDestroyedError(() => source.clear());
      ignoreNativeDestroyedError(() =>
        withControllerMap(controller, map => map.removeSource(source)),
      );
      ignoreNativeDestroyedError(() => destroyIfPresent(source));
      geometrySourceRef.current = null;
    }
    destroyAll(geometryObjectsRef.current);
    geometryObjectsRef.current = [];
  }, []);

  const stopFpsTracking = useCallback(() => {
    fpsConnectionRef.current?.disconnect();
    fpsConnectionRef.current = null;
    ignoreNativeDestroyedError(() => destroyIfPresent(rendererRef.current));
    rendererRef.current = null;
    stopFps();
  }, [stopFps]);

  const destroyCurrentMove = useCallback(() => {
    destroyIfPresent(moveFutureRef.current);
    moveFutureRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopFpsTracking();
      destroyCurrentMove();
      if (mapController) {
        cleanupObjects(mapController);
      } else {
        const managerResources = mapObjectManagerRef.current;
        if (managerResources) {
          ignoreNativeDestroyedError(() =>
            managerResources.manager.removeAll(),
          );
          ignoreNativeDestroyedError(() =>
            destroyIfPresent(managerResources.manager),
          );
          ignoreNativeDestroyedError(() =>
            destroyIfPresent(managerResources.map),
          );
        }
        destroyAll(mapObjectsRef.current);
        mapObjectsRef.current = [];
        mapObjectManagerRef.current = null;
        ignoreNativeDestroyedError(() => geometrySourceRef.current?.clear());
        ignoreNativeDestroyedError(() =>
          destroyIfPresent(geometrySourceRef.current),
        );
        geometrySourceRef.current = null;
        destroyAll(geometryObjectsRef.current);
        geometryObjectsRef.current = [];
      }
    };
  }, [cleanupObjects, destroyCurrentMove, mapController, stopFpsTracking]);

  const startFpsTracking = useCallback(
    (controller: MapController) => {
      fpsConnectionRef.current?.disconnect();
      ignoreNativeDestroyedError(() => destroyIfPresent(rendererRef.current));
      rendererRef.current = null;
      startFps();

      const renderer = controller.renderer;
      rendererRef.current = renderer;
      const channel = renderer.fpsChannel;
      fpsConnectionRef.current = channel.subscribe((v: Fps) => {
        pushFps(v.value);
      });
    },
    [pushFps, startFps],
  );

  const moveSequentially = useCallback(
    (controller: MapController, path: CameraPath, index: number) => {
      if (index >= path.length) {
        stopFpsTracking();
        setRunning(false);
        return;
      }
      const { position, duration, animationType } = path[index]!;
      let future: Future<CameraAnimatedMoveResult>;
      try {
        future = withControllerMap(controller, map =>
          withMapCamera(map, camera =>
            camera.moveToCameraPosition(position, duration, animationType),
          ),
        );
      } catch (error) {
        if (isNativeDestroyedError(error)) {
          stopFpsTracking();
          setRunning(false);
          return;
        }
        throw error;
      }
      moveFutureRef.current = future;
      future.onComplete(
        () => {
          if (moveFutureRef.current === future) {
            moveFutureRef.current = null;
          }
          destroyIfPresent(future);
          moveSequentially(controller, path, index + 1);
        },
        () => {
          if (moveFutureRef.current === future) {
            moveFutureRef.current = null;
          }
          destroyIfPresent(future);
          stopFpsTracking();
          setRunning(false);
        },
      );
    },
    [stopFpsTracking],
  );

  const runPath = useCallback(
    (entry: CameraPathEntry) => {
      if (!mapController || running) return;
      const { path, label } = entry;
      setRunning(true);

      stopFpsTracking();
      destroyCurrentMove();
      cleanupObjects(mapController);

      try {
        withControllerMap(mapController, map =>
          withMapCamera(map, camera => {
            camera.position = new CameraPosition({
              point: new GeoPoint({
                latitude: path[0]!.position.point.latitude,
                longitude: path[0]!.position.point.longitude,
              }),
              zoom: new Zoom({ value: 13 }),
            });
          }),
        );

        if (label === 'Polygons') {
          const map = mapController.map;
          const manager = new MapObjectManager(map, null);
          mapObjectManagerRef.current = { manager, map };
          const polygons = BENCHMARK_POLYGONS.map(opts => new Polygon(opts));
          mapObjectsRef.current = polygons;
          manager.addObjects(polygons);
        } else if (label === 'Moscow GeoJson') {
          const sourceBuilder = new GeometryMapObjectSourceBuilder(context);
          const source = sourceBuilder.createSource();
          destroyIfPresent(sourceBuilder);
          geometrySourceRef.current = source;
          withControllerMap(mapController, map => map.addSource(source));
          const geoObjects = parseGeoJson(JSON.stringify(moscowGeoJsonRaw));
          geometryObjectsRef.current = geoObjects;
          source.addObjects(geoObjects);
        }

        startFpsTracking(mapController);
        moveSequentially(mapController, path, 0);
      } catch (error) {
        stopFpsTracking();
        destroyCurrentMove();
        cleanupObjects(mapController);
        setRunning(false);
        if (!isNativeDestroyedError(error)) {
          throw error;
        }
      }
    },
    [
      mapController,
      running,
      context,
      cleanupObjects,
      destroyCurrentMove,
      startFpsTracking,
      stopFpsTracking,
      moveSequentially,
    ],
  );

  const { values, last } = fpsSnapshot;
  const { avg, p1, p01 } = computeStats(values);

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      {/* FPS graph overlay — pinned to bottom, like iOS */}
      <View style={styles.graphOverlay}>
        <FpsLineGraph values={values} maxFps={MAX_FPS} height={GRAPH_HEIGHT} />
        {/* Stats overlaid on top-left of graph, like iOS */}
        <View style={styles.statsOverlay}>
          <Text style={styles.statText}>FPS: {last.toFixed(2)}</Text>
          <Text style={styles.statText}>Avg: {avg.toFixed(2)}</Text>
          <Text style={styles.statText}>1%: {p1.toFixed(2)}</Text>
          <Text style={styles.statText}>0.1%: {p01.toFixed(2)}</Text>
        </View>
      </View>

      {/* Path buttons — above the graph */}
      <View style={[styles.panel, { bottom: GRAPH_HEIGHT + spacing.sm }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CAMERA_PATHS.map(entry => (
            <TouchableOpacity
              key={entry.label}
              style={[styles.button, running && styles.buttonDisabled]}
              disabled={running}
              onPress={() => runPath(entry)}
            >
              <Text style={styles.buttonText}>{entry.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Line-style FPS graph ────────────────────────────────────────────────────
// Approximates the iOS SwiftUI Path graph. Downsamples values into a fixed
// number of columns (MAX_COLUMNS) so the View count stays bounded regardless
// of how many FPS samples accumulate. Each column shows the average FPS of
// the samples it covers.

const MAX_COLUMNS = 200;

function downsample(values: number[], buckets: number): number[] {
  if (values.length <= buckets) return values;
  const result: number[] = [];
  const step = values.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let sum = 0;
    for (let j = start; j < end; j++) sum += values[j]!;
    result.push(sum / (end - start));
  }
  return result;
}

const FpsLineGraph = React.memo(function FpsLineGraph({
  values,
  maxFps,
  height,
}: {
  values: number[];
  maxFps: number;
  height: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width),
    [],
  );

  const columns = useMemo(() => downsample(values, MAX_COLUMNS), [values]);
  const sliceW = columns.length > 0 ? width / columns.length : 0;

  if (columns.length === 0 || width === 0) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  return (
    <View style={{ height, overflow: 'hidden' }} onLayout={onLayout}>
      <View style={lineStyles.barsRow}>
        {columns.map((fps, i) => {
          const clamped = Math.min(fps, maxFps);
          const h = Math.max(1, (clamped / maxFps) * height);
          return (
            <View
              key={i}
              style={{
                width: Math.max(sliceW, 0.5),
                height: h,
                backgroundColor: colors.textInverse,
              }}
            />
          );
        })}
      </View>
    </View>
  );
});

const lineStyles = StyleSheet.create({
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
});

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Path buttons
  panel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  button: {
    backgroundColor: colors.header,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: themeRadius.sm,
    marginRight: spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.textInverse, fontSize: 13, fontWeight: '600' },

  // Graph overlay — pinned to bottom like iOS
  graphOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: GRAPH_HEIGHT,
    backgroundColor: 'rgba(128,128,128,0.4)',
  },

  // Stats on top of graph
  statsOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.xl,
  },
  statText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
});
