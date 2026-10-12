import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bearing,
  CameraAnimationType,
  CameraPosition,
  Circle,
  CircleOptions,
  Color,
  Duration,
  GeoPoint,
  GeoPointWithElevation,
  ImageLoader,
  LogicalPixel,
  MapObjectManager,
  MapView,
  Marker,
  MarkerOptions,
  Meter,
  Padding,
  Polygon,
  PolygonOptions,
  TextStyle,
  Tilt,
  calcPositionForObjects,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Camera as SdkCamera,
  Map as SdkMap,
  SimpleMapObject,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { type DemoImageCache, loadCircleMarkerImage } from './mapDemoAssets';
import {
  destroyAll,
  destroyCachedValue,
  destroyResolvedCacheValues,
  destroyIfPresent,
} from './demoNativeCleanup';
import { colors, radius as themeRadius, spacing } from '../theme/theme';

// ── ARGB helpers ────────────────────────────────────────────────────────────
const RED = 0xffff0000;
const BLUE = 0xff2196f3;

// ── Marker data (positions matching Flutter) ────────────────────────────────

interface MarkerGroup {
  label: string;
  points: { lat: number; lon: number }[];
}

const MARKER_GROUPS: MarkerGroup[] = [
  {
    label: 'Marker',
    points: [{ lat: 55.744213, lon: 37.624631 }],
  },
  {
    label: 'Markers',
    points: [
      { lat: 55.744213, lon: 37.624631 },
      { lat: 55.744213, lon: 37.627422 },
      { lat: 55.740861, lon: 37.627422 },
      { lat: 55.740861, lon: 37.62463 },
    ],
  },
  {
    label: 'Rect markers 180°',
    points: [
      { lat: -53.744213, lon: 175.624631 },
      { lat: -53.744213, lon: -177.627422 },
      { lat: -57.740861, lon: -177.627422 },
      { lat: -57.740861, lon: 175.624631 },
    ],
  },
  {
    label: 'Markers 180°',
    points: [
      { lat: 63.744213, lon: 170.624631 },
      { lat: 63.744213, lon: -170.627422 },
      { lat: 67.740861, lon: -177.627422 },
      { lat: 67.740861, lon: 175.624631 },
    ],
  },
  {
    label: 'Rect markers 0°',
    points: [
      { lat: -53.744213, lon: 25.624631 },
      { lat: -53.744213, lon: -27.627422 },
      { lat: -57.740861, lon: -27.627422 },
      { lat: -57.740861, lon: 25.624631 },
    ],
  },
  {
    label: 'Markers 0°',
    points: [
      { lat: 63.744213, lon: 20.624631 },
      { lat: 63.744213, lon: -20.627422 },
      { lat: 67.740861, lon: -27.627422 },
      { lat: 67.740861, lon: 25.624631 },
    ],
  },
];

const POLYGON_POINTS: { lat: number; lon: number }[] = [
  { lat: 55.656843, lon: 37.520876 },
  { lat: 55.636271, lon: 37.558983 },
  { lat: 55.624607, lon: 37.560663 },
  { lat: 55.617338, lon: 37.527384 },
  { lat: 55.62257, lon: 37.494438 },
  { lat: 55.635209, lon: 37.481369 },
];

const CIRCLE_POS = { lat: 55.840861, lon: 37.72463 };

interface CameraSnapshot {
  padding: Padding;
  position: CameraPosition;
}

function withMapCamera<T>(map: SdkMap, action: (camera: SdkCamera) => T): T {
  const camera = map.camera;
  try {
    return action(camera);
  } finally {
    destroyIfPresent(camera);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Demonstrates calcPositionForObjects — fitting the camera to a set of map
 * objects with configurable padding, tilt, and bearing.
 */
export function CalcPositionDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const imageLoaderRef = useRef<ImageLoader | null>(null);

  const mapRef = useRef<SdkMap | null>(null);
  const managerRef = useRef<MapObjectManager | null>(null);
  const objectsRef = useRef<Map<string, SimpleMapObject[]>>(new Map());
  const lifecycleVersionRef = useRef(0);
  const imageCacheRef = useRef<DemoImageCache>(new Map());
  const runMoveFuture = useLatestFuture();
  const [standalone, setStandalone] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingObjects, setPendingObjects] = useState<
    SimpleMapObject[] | null
  >(null);
  const [paddingOverlay, setPaddingOverlay] = useState<Padding | null>(null);
  const [cameraSnapshot, setCameraSnapshot] = useState<CameraSnapshot | null>(
    null,
  );
  const [density, setDensity] = useState(1);

  if (imageLoaderRef.current === null) {
    imageLoaderRef.current = new ImageLoader(context);
  }

  useEffect(() => {
    if (!mapController) return;
    const map = mapController.map;
    mapRef.current = map;
    setDensity(withMapCamera(map, camera => camera.deviceDensity.value));
    const manager = new MapObjectManager(map, null);
    managerRef.current = manager;
    const requestVersion = lifecycleVersionRef.current;
    const createdObjects: SimpleMapObject[] = [];
    let cancelled = false;

    void (async () => {
      try {
        const markerIcon = await loadCircleMarkerImage(
          imageLoaderRef.current!,
          imageCacheRef.current,
        );
        if (cancelled || requestVersion !== lifecycleVersionRef.current) {
          destroyCachedValue(imageCacheRef.current, markerIcon);
          return;
        }

        for (const group of MARKER_GROUPS) {
          const markers = group.points.map(
            p =>
              new Marker(
                new MarkerOptions({
                  position: new GeoPointWithElevation({
                    latitude: { value: p.lat },
                    longitude: { value: p.lon },
                  }),
                  icon: markerIcon,
                  text: 'X',
                  textStyle: new TextStyle({
                    fontSize: new LogicalPixel({ value: 24 }),
                    color: new Color({ argb: RED }),
                  }),
                }),
              ),
          );
          createdObjects.push(...markers);
          objectsRef.current.set(group.label, markers);
          manager.addObjects(markers);
        }

        const circle = new Circle(
          new CircleOptions({
            position: new GeoPoint({
              latitude: { value: CIRCLE_POS.lat },
              longitude: { value: CIRCLE_POS.lon },
            }),
            radius: new Meter({ value: 1000 }),
            color: new Color({ argb: RED }),
            strokeColor: new Color({ argb: BLUE }),
            strokeWidth: new LogicalPixel({ value: 1 }),
          }),
        );
        createdObjects.push(circle);
        manager.addObject(circle);
        objectsRef.current.set('Circle', [circle]);

        const polygon = new Polygon(
          new PolygonOptions({
            contours: [
              POLYGON_POINTS.map(
                p =>
                  new GeoPoint({
                    latitude: { value: p.lat },
                    longitude: { value: p.lon },
                  }),
              ),
            ],
            color: new Color({ argb: RED }),
            strokeColor: new Color({ argb: BLUE }),
            strokeWidth: new LogicalPixel({ value: 10 }),
          }),
        );
        createdObjects.push(polygon);
        manager.addObject(polygon);
        objectsRef.current.set('Polygon', [polygon]);

        const markersGroup = objectsRef.current.get('Markers') ?? [];
        objectsRef.current.set('Markers and Circle', [circle, ...markersGroup]);
      } catch (error) {
        if (!cancelled) {
          Alert.alert('Failed to load calc-position assets', String(error));
        }
      }
    })();

    const currentObjects = objectsRef.current;
    const imageCache = imageCacheRef.current;

    return () => {
      cancelled = true;
      lifecycleVersionRef.current += 1;
      manager.removeAll();
      destroyAll(createdObjects);
      destroyResolvedCacheValues(imageCache);
      destroyIfPresent(manager);
      destroyIfPresent(map);
      managerRef.current = null;
      mapRef.current = null;
      currentObjects.clear();
    };
  }, [mapController]);

  const doCalcPosition = useCallback(
    (
      objects: SimpleMapObject[],
      overridePadding?: Padding,
      overrideTilt?: Tilt,
      overrideBearing?: Bearing,
    ) => {
      const map = mapRef.current;
      if (!map) return;

      withMapCamera(map, camera => {
        const pad = overridePadding ?? camera.padding;
        const tilt = overrideTilt ?? camera.position.tilt;
        const bearing = overrideBearing ?? camera.position.bearing;
        const newPos = calcPositionForObjects(
          camera,
          objects,
          null,
          pad,
          tilt,
          bearing,
          null,
        );
        runMoveFuture(
          camera.moveToCameraPosition(
            newPos,
            Duration.ofMilliseconds(500),
            CameraAnimationType.Default,
          ),
          () => {},
          error => Alert.alert('Failed to move camera', String(error)),
        );
      });
    },
    [runMoveFuture],
  );

  const openSettings = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    withMapCamera(map, camera => {
      setCameraSnapshot({
        padding: camera.padding,
        position: camera.position,
      });
      setShowSettings(true);
    });
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setPendingObjects(null);
    setCameraSnapshot(null);
  }, []);

  const handleActionSelect = useCallback(
    (key: string) => {
      setShowActions(false);
      const objects = objectsRef.current.get(key);
      if (!objects) return;
      if (standalone) {
        setPendingObjects(objects);
        openSettings();
      } else {
        doCalcPosition(objects);
      }
    },
    [doCalcPosition, openSettings, standalone],
  );

  const handleSettingsApply = useCallback(
    (pad: Padding, tilt: Tilt, bearing: Bearing) => {
      const map = mapRef.current;
      if (!map) return;

      withMapCamera(map, camera => {
        if (!standalone) {
          const position = camera.position;
          camera.padding = pad;
          camera.position = new CameraPosition({
            point: position.point,
            zoom: position.zoom,
            tilt,
            bearing,
          });
          setPaddingOverlay(pad);
        } else if (pendingObjects) {
          const newPos = calcPositionForObjects(
            camera,
            pendingObjects,
            null,
            pad,
            tilt,
            bearing,
            null,
          );
          runMoveFuture(
            camera.moveToCameraPosition(
              newPos,
              Duration.ofMilliseconds(500),
              CameraAnimationType.Default,
            ),
            () => {},
            error => Alert.alert('Failed to move camera', String(error)),
          );
        }
      });
      closeSettings();
    },
    [closeSettings, pendingObjects, runMoveFuture, standalone],
  );

  const handleStandaloneToggle = useCallback((value: boolean) => {
    setStandalone(value);
    const map = mapRef.current;
    if (value && map) {
      withMapCamera(map, camera => {
        const position = camera.position;
        camera.position = new CameraPosition({
          point: position.point,
          zoom: position.zoom,
          tilt: new Tilt({ value: 0 }),
          bearing: new Bearing({ value: 0 }),
        });
        camera.padding = new Padding({});
      });
      setPaddingOverlay(null);
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      {/* Padding overlay rect */}
      {paddingOverlay && (
        <View
          style={[
            styles.paddingRect,
            {
              top: paddingOverlay.top / density,
              bottom: paddingOverlay.bottom / density,
              left: paddingOverlay.left / density,
              right: paddingOverlay.right / density,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Buttons */}
      <View style={styles.buttonColumn}>
        <TouchableOpacity style={styles.iconBtn} onPress={openSettings}>
          <Text style={styles.iconBtnText}>⚙</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowActions(true)}
        >
          <Text style={styles.iconBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Action sheet */}
      {showActions && (
        <ActionSheet
          items={[
            ...MARKER_GROUPS.map(g => g.label),
            'Polygon',
            'Circle',
            'Markers and Circle',
          ]}
          onSelect={handleActionSelect}
          onCancel={() => setShowActions(false)}
        />
      )}

      {/* Settings dialog */}
      {showSettings && cameraSnapshot && (
        <SettingsDialog
          cameraSnapshot={cameraSnapshot}
          standalone={standalone}
          onStandaloneToggle={handleStandaloneToggle}
          onSubmit={handleSettingsApply}
          onCancel={closeSettings}
        />
      )}
    </View>
  );
}

// ── Action sheet ────────────────────────────────────────────────────────────

function ActionSheet({
  items,
  onSelect,
  onCancel,
}: {
  items: string[];
  onSelect: (key: string) => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select object</Text>
          <ScrollView>
            {items.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.sheetItem}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.sheetItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.sheetCancel} onPress={onCancel}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Settings dialog ─────────────────────────────────────────────────────────

function SettingsDialog({
  cameraSnapshot,
  standalone,
  onStandaloneToggle,
  onSubmit,
  onCancel,
}: {
  cameraSnapshot: CameraSnapshot;
  standalone: boolean;
  onStandaloneToggle: (v: boolean) => void;
  onSubmit: (pad: Padding, tilt: Tilt, bearing: Bearing) => void;
  onCancel: () => void;
}) {
  const currentPad = cameraSnapshot.padding;
  const currentPos = cameraSnapshot.position;

  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [tilt, setTiltVal] = useState('');
  const [bearing, setBearingVal] = useState('');

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Settings</Text>
          <ScrollView style={styles.dialogBody}>
            <Field
              label={`Top: ${currentPad.top}`}
              value={top}
              onChangeText={setTop}
              keyboardType="numeric"
            />
            <Field
              label={`Bottom: ${currentPad.bottom}`}
              value={bottom}
              onChangeText={setBottom}
              keyboardType="numeric"
            />
            <Field
              label={`Left: ${currentPad.left}`}
              value={left}
              onChangeText={setLeft}
              keyboardType="numeric"
            />
            <Field
              label={`Right: ${currentPad.right}`}
              value={right}
              onChangeText={setRight}
              keyboardType="numeric"
            />
            <Field
              label={`Tilt: ${currentPos.tilt.value}`}
              value={tilt}
              onChangeText={setTiltVal}
              keyboardType="numeric"
            />
            <Field
              label={`Bearing: ${currentPos.bearing.value}`}
              value={bearing}
              onChangeText={setBearingVal}
              keyboardType="numeric"
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Use Standalone calcPosition
              </Text>
              <Switch value={standalone} onValueChange={onStandaloneToggle} />
            </View>
          </ScrollView>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onCancel}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogBtn,
                styles.dialogBtnPrimary,
                standalone && !tilt && !bearing ? {} : {},
              ]}
              onPress={() => {
                const pad = new Padding({
                  left: parseInt(left, 10) || 0,
                  right: parseInt(right, 10) || 0,
                  top: parseInt(top, 10) || 0,
                  bottom: parseInt(bottom, 10) || 0,
                });
                const t = new Tilt({ value: parseFloat(tilt) || 0 });
                const b = new Bearing({ value: parseFloat(bearing) || 0 });
                onSubmit(pad, t, b);
              }}
            >
              <Text style={[styles.dialogBtnText, styles.dialogBtnTextPrimary]}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Field ───────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Padding overlay
  paddingRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'red',
  },

  // Buttons
  buttonColumn: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.header,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: { color: colors.textInverse, fontSize: 20 },

  // Action sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 30,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetItemText: {
    fontSize: 16,
    color: colors.accent,
    textAlign: 'center',
  },
  sheetCancel: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Settings dialog
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: spacing.xl,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: spacing.lg,
    textAlign: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dialogBody: { padding: spacing.lg },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  dialogBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: themeRadius.sm,
  },
  dialogBtnPrimary: { backgroundColor: colors.header },
  dialogBtnText: { fontSize: 14, color: colors.textPrimary },
  dialogBtnTextPrimary: { color: colors.textInverse, fontWeight: '600' },

  // Field
  field: { marginBottom: spacing.md },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  switchLabel: { fontSize: 14, color: colors.textPrimary, flex: 1 },
});
