import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  EnumSet,
  GeoPointWithElevation,
  MapObjectManager,
  MapView,
  Marker,
  MarkerOptions,
  TransformGesture,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Camera as SdkCamera,
  Connection,
  GestureManager,
  Map as SdkMap,
  MapController,
  MapGestureRecognizer,
  Projection as SdkProjection,
  ScreenPoint,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useNative } from '../hooks/useNative';
import { destroyAll, destroyIfPresent } from './demoNativeCleanup';
import {
  cardShadow,
  colors,
  radius as themeRadius,
  spacing,
} from '../theme/theme';

interface GestureState {
  shift: boolean;
  scaling: boolean;
  rotation: boolean;
  multiTouchShift: boolean;
  tilt: boolean;
}

const DEFAULT_GESTURE_STATE: GestureState = {
  shift: true,
  scaling: true,
  rotation: true,
  multiTouchShift: true,
  tilt: true,
};

interface MapObjectManagerResources {
  manager: MapObjectManager;
  map: SdkMap;
  destroy(): void;
}

function createMapObjectManagerResources(
  controller: MapController,
): MapObjectManagerResources {
  const map = controller.map;
  const manager = new MapObjectManager(map, null);

  return {
    manager,
    map,
    destroy() {
      destroyIfPresent(manager);
      destroyIfPresent(map);
    },
  };
}

function withMapProjection<T>(
  map: SdkMap,
  action: (projection: SdkProjection) => T,
): T {
  const camera: SdkCamera = map.camera;
  try {
    const projection = camera.projection;
    try {
      return action(projection);
    } finally {
      destroyIfPresent(projection);
    }
  } finally {
    destroyIfPresent(camera);
  }
}

/**
 * Demonstrates gesture configuration: disabling individual transform gestures
 * and custom touch event observation (tap, long touch, drag).
 */
export function MapGesturesDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const [showActions, setShowActions] = useState(false);
  const [showGestureSettings, setShowGestureSettings] = useState(false);
  const [observerEnabled, setObserverEnabled] = useState(false);
  const [lastEvent, setLastEvent] = useState('No touch events yet');
  const [gestureState, setGestureState] = useState<GestureState>(
    DEFAULT_GESTURE_STATE,
  );

  const managerRef = useRef<MapObjectManager | null>(null);
  const markerCounterRef = useRef(0);
  const markersByIdRef = useRef<Map<number, Marker>>(new Map());
  const draggedIdRef = useRef<number | null>(null);
  const observerConnectionsRef = useRef<Connection[]>([]);
  const managerResources = useNative<MapObjectManagerResources>(
    () =>
      mapController ? createMapObjectManagerResources(mapController) : null,
    [mapController],
  );
  const manager = managerResources?.manager ?? null;
  const map = managerResources?.map ?? null;
  const gestureRecognizer = useNative<MapGestureRecognizer>(
    () => mapController?.gestureRecognizer ?? null,
    [mapController],
  );
  const gestureManager = useNative<GestureManager>(
    () => gestureRecognizer?.gestureManager ?? null,
    [gestureRecognizer],
  );

  const enabledGestureSet = useMemo(
    () =>
      EnumSet.of(
        TransformGesture,
        ...(gestureState.shift ? [TransformGesture.Shift] : []),
        ...(gestureState.scaling ? [TransformGesture.Scaling] : []),
        ...(gestureState.rotation ? [TransformGesture.Rotation] : []),
        ...(gestureState.multiTouchShift
          ? [TransformGesture.MultiTouchShift]
          : []),
        ...(gestureState.tilt ? [TransformGesture.Tilt] : []),
      ),
    [gestureState],
  );

  const clearObserverConnections = useCallback(() => {
    for (const c of observerConnectionsRef.current) c.disconnect();
    observerConnectionsRef.current = [];
    draggedIdRef.current = null;
  }, []);

  useEffect(() => {
    managerRef.current = manager;
    const markersByIdSnapshot = markersByIdRef.current;
    return () => {
      clearObserverConnections();
      managerRef.current?.removeAll();
      destroyAll(markersByIdSnapshot.values());
      managerRef.current = null;
      markersByIdSnapshot.clear();
      setObserverEnabled(false);
    };
  }, [clearObserverConnections, manager]);

  useEffect(() => {
    if (!gestureManager) return;

    const next: GestureState = {
      shift: gestureManager.gestureEnabled(TransformGesture.Shift),
      scaling: gestureManager.gestureEnabled(TransformGesture.Scaling),
      rotation: gestureManager.gestureEnabled(TransformGesture.Rotation),
      multiTouchShift: gestureManager.gestureEnabled(
        TransformGesture.MultiTouchShift,
      ),
      tilt: gestureManager.gestureEnabled(TransformGesture.Tilt),
    };
    setGestureState(next);
  }, [gestureManager]);

  useEffect(() => {
    if (!gestureManager) return;
    gestureManager.enabledGestures = enabledGestureSet;
  }, [gestureManager, enabledGestureSet]);

  const addMarkerAtScreenPoint = (point: ScreenPoint) => {
    if (!map || !managerRef.current) return;
    const geoPoint = withMapProjection(map, projection =>
      projection.screenToMap(point),
    );
    if (!geoPoint) return;

    const id = markerCounterRef.current++;
    const marker = new Marker(
      new MarkerOptions({
        position: new GeoPointWithElevation({
          latitude: geoPoint.latitude,
          longitude: geoPoint.longitude,
        }),
        icon: null,
        text: `M${id}`,
        draggable: true,
        userData: { id },
      }),
    );
    managerRef.current.addObject(marker);
    markersByIdRef.current.set(id, marker);
  };

  const enableObserver = () => {
    if (!gestureRecognizer) return;
    clearObserverConnections();

    const connections: Connection[] = [];

    connections.push(
      gestureRecognizer.tap.subscribe(point => {
        addMarkerAtScreenPoint(point);
        setLastEvent(`Tap: (${Math.round(point.x)}, ${Math.round(point.y)})`);
      }),
    );

    connections.push(
      gestureRecognizer.longTouch.subscribe(point => {
        managerRef.current?.removeAll();
        destroyAll(markersByIdRef.current.values());
        markersByIdRef.current.clear();
        setLastEvent(
          `Long touch: (${Math.round(point.x)}, ${Math.round(
            point.y,
          )}) -> clear all`,
        );
      }),
    );

    connections.push(
      gestureRecognizer.dragBegin.subscribe(data => {
        const mapObject = data.item.item;
        const id = (mapObject.userData as { id?: number } | null)?.id;
        if (typeof id === 'number' && markersByIdRef.current.has(id)) {
          draggedIdRef.current = id;
          setLastEvent(`Drag begin: marker ${id}`);
        }
      }),
    );

    connections.push(
      gestureRecognizer.dragMove.subscribe(point => {
        if (!map) return;
        const id = draggedIdRef.current;
        if (id == null) return;
        const marker = markersByIdRef.current.get(id);
        if (!marker) return;

        const geoPoint = withMapProjection(map, projection =>
          projection.screenToMap(point),
        );
        if (!geoPoint) return;

        marker.position = new GeoPointWithElevation({
          latitude: geoPoint.latitude,
          longitude: geoPoint.longitude,
        });
      }),
    );

    connections.push(
      gestureRecognizer.dragEnd.subscribe(() => {
        if (draggedIdRef.current != null) {
          setLastEvent(`Drag end: marker ${draggedIdRef.current}`);
        }
        draggedIdRef.current = null;
      }),
    );

    observerConnectionsRef.current = connections;
    setObserverEnabled(true);
  };

  const disableObserver = () => {
    clearObserverConnections();
    setObserverEnabled(false);
    setLastEvent('Custom touch observer disabled');
  };

  const toggleObserver = () => {
    if (observerEnabled) {
      disableObserver();
    } else {
      enableObserver();
    }
  };

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Touch events</Text>
        <Text style={styles.statusText}>{lastEvent}</Text>
      </View>

      <View style={styles.buttonColumn}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowActions(true)}
        >
          <Text style={styles.iconBtnText}>≡</Text>
        </TouchableOpacity>
      </View>

      {showActions && (
        <ActionSheet
          observerEnabled={observerEnabled}
          onClose={() => setShowActions(false)}
          onOpenGestures={() => {
            setShowActions(false);
            setShowGestureSettings(true);
          }}
          onToggleObserver={() => {
            setShowActions(false);
            toggleObserver();
          }}
        />
      )}

      {showGestureSettings && (
        <GestureSettingsDialog
          value={gestureState}
          onClose={() => setShowGestureSettings(false)}
          onApply={next => {
            setGestureState(next);
            setShowGestureSettings(false);
          }}
        />
      )}
    </View>
  );
}

function ActionSheet({
  observerEnabled,
  onClose,
  onOpenGestures,
  onToggleObserver,
}: {
  observerEnabled: boolean;
  onClose: () => void;
  onOpenGestures: () => void;
  onToggleObserver: () => void;
}) {
  return (
    <Modal transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Gesture settings</Text>
          <TouchableOpacity style={styles.sheetItem} onPress={onOpenGestures}>
            <Text style={styles.sheetItemText}>Disabling gestures</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetItem} onPress={onToggleObserver}>
            <Text style={styles.sheetItemText}>
              {observerEnabled
                ? 'Disable custom TouchEventsObserver'
                : 'Enable custom TouchEventsObserver'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function GestureSettingsDialog({
  value,
  onApply,
  onClose,
}: {
  value: GestureState;
  onApply: (v: GestureState) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<GestureState>(value);

  const setKey = (key: keyof GestureState, v: boolean) => {
    setDraft(prev => ({ ...prev, [key]: v }));
  };

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Gestures</Text>
          <ScrollView style={styles.dialogBody}>
            <SwitchRow
              label="Shift"
              value={draft.shift}
              onValueChange={v => setKey('shift', v)}
            />
            <SwitchRow
              label="Scaling"
              value={draft.scaling}
              onValueChange={v => setKey('scaling', v)}
            />
            <SwitchRow
              label="Rotation"
              value={draft.rotation}
              onValueChange={v => setKey('rotation', v)}
            />
            <SwitchRow
              label="MultiTouchShift"
              value={draft.multiTouchShift}
              onValueChange={v => setKey('multiTouchShift', v)}
            />
            <SwitchRow
              label="Tilt"
              value={draft.tilt}
              onValueChange={v => setKey('tilt', v)}
            />
          </ScrollView>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onClose}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtn, styles.dialogBtnPrimary]}
              onPress={() => onApply(draft)}
            >
              <Text style={[styles.dialogBtnText, styles.dialogBtnTextPrimary]}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  statusCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...cardShadow,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  buttonColumn: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadow,
  },
  iconBtnText: { color: colors.textPrimary, fontSize: 20 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  sheetCancel: { marginTop: spacing.sm, paddingVertical: spacing.md },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchLabel: { fontSize: 14, color: colors.textPrimary, flex: 1 },
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
});
