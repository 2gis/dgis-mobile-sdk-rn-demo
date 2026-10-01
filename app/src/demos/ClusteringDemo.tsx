import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  LogicalPixel,
  MapDataLoadingState,
  MapObjectManager,
  MapView,
  Marker,
  MarkerOptions,
  ScreenPoint,
  SimpleClusterOptions,
  Zoom,
  GeoPointWithElevation,
  ZIndex,
  ImageLoader,
} from '@2gis/dgis-mobile-sdk-map';
import type {
  Camera as SdkCamera,
  Image as SdkImage,
  Map as SdkMap,
  Projection as SdkProjection,
  SimpleClusterObject,
  SimpleClusterRenderer,
} from '@2gis/dgis-mobile-sdk-map';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import {
  DEMO_MARKER_TYPE_OPTIONS,
  type DemoImageCache,
  type DemoMarkerType,
  loadClusterMarkerImage,
  loadDemoMarkerImage,
} from './mapDemoAssets';
import {
  destroyAll,
  destroyCachedValue,
  destroyResolvedCacheValues,
  destroyIfPresent,
  ignoreNativeDestroyedError,
  isNativeDestroyedError,
} from './demoNativeCleanup';
import {
  cardShadow,
  colors,
  radius as themeRadius,
  spacing,
} from '../theme/theme';

// ── Clustering type enum ────────────────────────────────────────────────────

type GroupingType = 'none' | 'clustering' | 'generalization';

// ── Clustering renderer ─────────────────────────────────────────────────────

interface ClusterImageHolder {
  image: SdkImage | null;
}

class SimpleClusterRendererImpl implements SimpleClusterRenderer {
  private clusterIndex = 0;

  constructor(private readonly imageHolder: ClusterImageHolder) {}

  renderCluster = (cluster: SimpleClusterObject): SimpleClusterOptions => {
    const count = cluster.objectCount;
    const image = this.imageHolder.image;
    this.clusterIndex += 1;

    const baseSize = 30;
    const iconSize = Math.min(baseSize * (1 + count / 50), 100);

    return new SimpleClusterOptions({
      icon: image,
      iconWidth: new LogicalPixel({ value: iconSize }),
      text: String(count),
      zIndex: new ZIndex({ value: 1 }),
      userData: { clusterIdx: this.clusterIndex },
    });
  };
}

function destroyMarkers(markers: Marker[]): void {
  destroyAll(markers);
}

function isResourcesResetError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === 'Clustering demo resources were reset during image load'
  );
}

function showAsyncError(title: string, error: unknown): void {
  if (!isNativeDestroyedError(error)) {
    Alert.alert(title, String(error));
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function withCamera<T>(sdkMap: SdkMap, action: (camera: SdkCamera) => T): T {
  const camera = sdkMap.camera;
  try {
    return action(camera);
  } finally {
    destroyIfPresent(camera);
  }
}

function withProjection<T>(
  sdkMap: SdkMap,
  action: (projection: SdkProjection) => T,
): T {
  return withCamera(sdkMap, camera => {
    const projection = camera.projection;
    try {
      return action(projection);
    } finally {
      destroyIfPresent(projection);
    }
  });
}

interface PendingMapLoad {
  cancel: () => void;
  promise: Promise<void>;
}

function isMapDataLoaded(map: SdkMap): boolean {
  try {
    return map.dataLoadingState === MapDataLoadingState.Loaded;
  } catch (error) {
    if (isNativeDestroyedError(error)) {
      return true;
    }
    throw error;
  }
}

function waitForMapDataLoaded(map: SdkMap): PendingMapLoad {
  let isSettled = false;
  let connection: { disconnect(): void } | null = null;
  let resolvePromise: () => void = () => {};

  const promise = new Promise<void>(resolve => {
    resolvePromise = resolve;
  });

  const settle = () => {
    if (isSettled) {
      return;
    }

    isSettled = true;
    connection?.disconnect();
    connection = null;
    resolvePromise();
  };

  const check = (state: MapDataLoadingState) => {
    if (state === MapDataLoadingState.Loaded) {
      settle();
    }
  };

  if (isMapDataLoaded(map)) {
    settle();
  } else {
    connection = map.dataLoadingStateChannel.subscribe(check);
    if (isMapDataLoaded(map)) {
      settle();
    }
  }

  return { cancel: settle, promise };
}

function generateRandomPointNear(map: SdkMap): GeoPointWithElevation | null {
  const size = withCamera(map, camera => camera.size);
  const minY = size.height / 3;
  const maxY = size.height - size.height / 3;

  const screenPt = new ScreenPoint({
    x: Math.random() * size.width,
    y: minY + Math.random() * (maxY - minY),
  });

  const mapPt = withProjection(map, projection =>
    projection.screenToMap(screenPt),
  );
  if (!mapPt) return null;

  return new GeoPointWithElevation({
    latitude: mapPt.latitude,
    longitude: mapPt.longitude,
  });
}

// ── Main component ──────────────────────────────────────────────────────────

/**
 * Demonstrates marker clustering and generalization with MapObjectManager.
 * Allows adding/removing markers in bulk and switching grouping types.
 */
export function ClusteringDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const imageLoaderRef = useRef<ImageLoader | null>(null);
  const lifecycleVersionRef = useRef(0);

  const mapRef = useRef<SdkMap | null>(null);
  const managerRef = useRef<MapObjectManager | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const markerCounterRef = useRef(0);
  const imageCacheRef = useRef<DemoImageCache>(new Map());
  const clusterImageHolderRef = useRef<ClusterImageHolder>({ image: null });
  const clusterRendererRef = useRef<SimpleClusterRendererImpl | null>(null);

  if (imageLoaderRef.current === null) {
    imageLoaderRef.current = new ImageLoader(context);
  }

  // State
  const [grouping, setGrouping] = useState<GroupingType>('clustering');
  const [objectsCount, setObjectsCount] = useState(100);
  const [minZoom, setMinZoom] = useState(0);
  const [maxZoom, setMaxZoom] = useState(19);
  const [markerType, setMarkerType] = useState<DemoMarkerType>('scooterPng');
  const [showActions, setShowActions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [infoText, setInfoText] = useState('Objects: 0');

  const getClusterRenderer = useCallback(async () => {
    if (clusterRendererRef.current) {
      return clusterRendererRef.current;
    }

    const requestVersion = lifecycleVersionRef.current;
    const image = await loadClusterMarkerImage(
      imageLoaderRef.current!,
      imageCacheRef.current,
    );

    if (requestVersion !== lifecycleVersionRef.current) {
      destroyCachedValue(imageCacheRef.current, image);
      throw new Error('Clustering demo resources were reset during image load');
    }

    clusterImageHolderRef.current.image = image;
    const renderer = new SimpleClusterRendererImpl(
      clusterImageHolderRef.current,
    );
    clusterRendererRef.current = renderer;
    return renderer;
  }, []);

  const resetNativeResources = useCallback(() => {
    lifecycleVersionRef.current += 1;

    managerRef.current?.removeAll();

    destroyMarkers(markersRef.current);
    destroyIfPresent(managerRef.current);
    managerRef.current = null;

    markersRef.current = [];
    clusterRendererRef.current = null;
    clusterImageHolderRef.current.image = null;
    destroyResolvedCacheValues(imageCacheRef.current);
    imageLoaderRef.current = null;
    ignoreNativeDestroyedError(() => {
      destroyIfPresent(mapRef.current);
    });
    mapRef.current = null;
  }, []);

  // Create / recreate MapObjectManager
  const createManager = useCallback(
    async (type: GroupingType, mapObj: SdkMap) => {
      const requestVersion = lifecycleVersionRef.current;

      if (managerRef.current) {
        managerRef.current.removeAll();
        destroyMarkers(markersRef.current);
        destroyIfPresent(managerRef.current);
        managerRef.current = null;
        markersRef.current = [];
      }

      if (imageLoaderRef.current === null) {
        imageLoaderRef.current = new ImageLoader(context);
      }

      let manager: MapObjectManager;

      switch (type) {
        case 'clustering': {
          const renderer = await getClusterRenderer();
          if (requestVersion !== lifecycleVersionRef.current) {
            throw new Error(
              'Clustering demo resources were reset during image load',
            );
          }

          manager = MapObjectManager.withClustering(
            mapObj,
            new LogicalPixel({ value: 80 }),
            new Zoom({ value: maxZoom }),
            renderer,
            new Zoom({ value: minZoom }),
            null,
          );
          break;
        }
        case 'generalization':
          manager = MapObjectManager.withGeneralization(
            mapObj,
            new LogicalPixel({ value: 80 }),
            new Zoom({ value: maxZoom }),
            new Zoom({ value: minZoom }),
            null,
          );
          break;
        case 'none':
        default:
          manager = new MapObjectManager(mapObj, null);
          break;
      }

      managerRef.current = manager;
      return manager;
    },
    [context, getClusterRenderer, maxZoom, minZoom],
  );

  // Initialize
  useEffect(() => {
    if (!mapController) return;

    let cancelled = false;
    let mapLoadWait: PendingMapLoad | null = null;
    const map = mapController.map;
    mapRef.current = map;

    const initializeManager = async () => {
      mapLoadWait = waitForMapDataLoaded(map);
      await mapLoadWait.promise;
      mapLoadWait = null;

      if (cancelled) {
        return;
      }

      const manager = await createManager(grouping, map);
      if (cancelled) {
        manager.removeAll();
        destroyIfPresent(manager);
        if (managerRef.current === manager) {
          managerRef.current = null;
        }
        return;
      }

      managerRef.current = manager;
      setInfoText(`Objects: ${markersRef.current.length}`);
    };

    initializeManager().catch(error => {
      if (!cancelled && !isResourcesResetError(error)) {
        showAsyncError('Failed to initialize clustering demo', error);
      }
    });

    return () => {
      cancelled = true;
      mapLoadWait?.cancel();
      resetNativeResources();
    };
  }, [mapController, grouping, createManager, resetNativeResources]);

  // Add markers
  const addMarkers = useCallback(
    async (count: number) => {
      const map = mapRef.current;
      if (!map || !managerRef.current) return;

      const requestVersion = lifecycleVersionRef.current;
      let icon: SdkImage;
      try {
        icon = await loadDemoMarkerImage(
          imageLoaderRef.current!,
          imageCacheRef.current,
          markerType,
        );
      } catch (error) {
        if (isResourcesResetError(error)) {
          return;
        }
        Alert.alert('Failed to load marker image', String(error));
        return;
      }

      if (
        requestVersion !== lifecycleVersionRef.current ||
        !managerRef.current
      ) {
        destroyCachedValue(imageCacheRef.current, icon);
        return;
      }

      const newMarkers: Marker[] = [];
      for (let i = 0; i < count; i++) {
        const pos = generateRandomPointNear(map);
        if (!pos) continue;

        const id = markerCounterRef.current++;
        const marker = new Marker(
          new MarkerOptions({
            position: pos,
            icon,
            iconWidth: new LogicalPixel({ value: 30 }),
            text: `#${id}`,
            userData: { id },
          }),
        );
        newMarkers.push(marker);
        markersRef.current.push(marker);
      }

      if (
        requestVersion !== lifecycleVersionRef.current ||
        !managerRef.current
      ) {
        destroyMarkers(newMarkers);
        markersRef.current = markersRef.current.filter(
          marker => !newMarkers.includes(marker),
        );
        return;
      }

      managerRef.current.addObjects(newMarkers);
      setInfoText(`Objects: ${markersRef.current.length}`);
    },
    [markerType],
  );

  // Remove markers
  const removeMarkers = useCallback((count: number) => {
    if (!managerRef.current || markersRef.current.length === 0) return;

    const removeCount = Math.min(count, markersRef.current.length);
    const toRemove = markersRef.current.splice(0, removeCount);
    managerRef.current.removeObjects(toRemove);
    destroyMarkers(toRemove);

    setInfoText(`Objects: ${markersRef.current.length}`);
  }, []);

  // Remove and add markers
  const removeAndAddMarkers = useCallback(
    (count: number) => {
      if (!mapController || !managerRef.current) return;

      const removeCount = Math.min(count, markersRef.current.length);
      if (removeCount > 0) {
        const toRemove = markersRef.current.splice(0, removeCount);
        managerRef.current.removeObjects(toRemove);
        destroyMarkers(toRemove);
      }

      addMarkers(count).catch(error => {
        showAsyncError('Failed to add markers', error);
      });
    },
    [mapController, addMarkers],
  );

  // Remove all
  const removeAll = useCallback(() => {
    managerRef.current?.removeAll();
    destroyMarkers(markersRef.current);
    markersRef.current = [];
    markerCounterRef.current = 0;
    setInfoText('Objects: 0');
  }, []);

  // Re-init manager with new settings
  const reinitManager = useCallback(
    (type: GroupingType, minZ: number, maxZ: number) => {
      if (!mapController) return;
      removeAll();
      setGrouping(type);
      setMinZoom(minZ);
      setMaxZoom(maxZ);
    },
    [mapController, removeAll],
  );

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      {/* Info bar */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>{infoText}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonColumn}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.iconBtnText}>⚙</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowActions(true)}
        >
          <Text style={styles.iconBtnText}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* Action menu */}
      {showActions && (
        <ActionSheet
          items={[
            {
              label: `Add ${objectsCount}`,
              action: () => {
                addMarkers(objectsCount).catch(error => {
                  showAsyncError('Failed to add markers', error);
                });
              },
            },
            {
              label: `Remove ${objectsCount}`,
              action: () => removeMarkers(objectsCount),
            },
            {
              label: `Remove & add ${objectsCount}`,
              action: () => removeAndAddMarkers(objectsCount),
            },
            {
              label: 'Reinit manager',
              action: () => reinitManager(grouping, minZoom, maxZoom),
            },
            { label: 'Remove all', action: removeAll },
          ]}
          onClose={() => setShowActions(false)}
        />
      )}

      {/* Settings dialog */}
      {showSettings && (
        <SettingsDialog
          grouping={grouping}
          objectsCount={objectsCount}
          minZoom={minZoom}
          maxZoom={maxZoom}
          markerType={markerType}
          onApply={(g, mt, oc, minZ, maxZ) => {
            setShowSettings(false);
            setMarkerType(mt);
            if (g !== grouping || minZ !== minZoom || maxZ !== maxZoom) {
              reinitManager(g, minZ, maxZ);
            }
            setObjectsCount(oc);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </View>
  );
}

// ── Action sheet ────────────────────────────────────────────────────────────

interface ActionItem {
  label: string;
  action: () => void;
}

function ActionSheet({
  items,
  onClose,
}: {
  items: ActionItem[];
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Actions</Text>
          <ScrollView>
            {items.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.sheetItem}
                onPress={() => {
                  onClose();
                  item.action();
                }}
              >
                <Text style={styles.sheetItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Settings dialog ─────────────────────────────────────────────────────────

interface SettingsProps {
  grouping: GroupingType;
  markerType: DemoMarkerType;
  objectsCount: number;
  minZoom: number;
  maxZoom: number;
  onApply: (
    grouping: GroupingType,
    markerType: DemoMarkerType,
    objectsCount: number,
    minZoom: number,
    maxZoom: number,
  ) => void;
  onClose: () => void;
}

function SettingsDialog({
  grouping,
  markerType,
  objectsCount,
  minZoom,
  maxZoom,
  onApply,
  onClose,
}: SettingsProps) {
  const [draft, setDraft] = useState({
    grouping,
    markerType,
    objectsCount: String(objectsCount),
    minZoom: String(minZoom),
    maxZoom: String(maxZoom),
  });

  const handleApply = () => {
    const oc = parseInt(draft.objectsCount, 10);
    const mnz = parseInt(draft.minZoom, 10);
    const mxz = parseInt(draft.maxZoom, 10);

    if (isNaN(oc) || isNaN(mnz) || isNaN(mxz)) {
      return;
    }

    onApply(draft.grouping, draft.markerType, oc, mnz, mxz);
  };

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Settings</Text>
          <ScrollView style={styles.dialogBody}>
            {/* Grouping type */}
            <Text style={styles.sectionLabel}>Grouping type</Text>
            {(['none', 'clustering', 'generalization'] as GroupingType[]).map(
              type => (
                <TouchableOpacity
                  key={type}
                  style={styles.radioRow}
                  onPress={() =>
                    setDraft(prev => ({ ...prev, grouping: type }))
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      draft.grouping === type && styles.radioActive,
                    ]}
                  />
                  <Text style={styles.radioLabel}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}

            <Text style={styles.sectionLabel}>Marker type</Text>
            {DEMO_MARKER_TYPE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioRow}
                onPress={() =>
                  setDraft(prev => ({ ...prev, markerType: option.value }))
                }
              >
                <View
                  style={[
                    styles.radio,
                    draft.markerType === option.value && styles.radioActive,
                  ]}
                />
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Number fields */}
            <NumField
              label="Objects count"
              value={draft.objectsCount}
              onChange={v => setDraft(prev => ({ ...prev, objectsCount: v }))}
            />
            <NumField
              label="Min zoom"
              value={draft.minZoom}
              onChange={v => setDraft(prev => ({ ...prev, minZoom: v }))}
            />
            <NumField
              label="Max zoom"
              value={draft.maxZoom}
              onChange={v => setDraft(prev => ({ ...prev, maxZoom: v }))}
            />
          </ScrollView>

          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onClose}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtn, styles.dialogBtnPrimary]}
              onPress={handleApply}
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

// ── Small components ────────────────────────────────────────────────────────

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Info bar
  infoBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...cardShadow,
  },
  infoText: { color: colors.textPrimary, fontSize: 13, textAlign: 'center' },

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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadow,
  },
  iconBtnText: { color: colors.textPrimary, fontSize: 20 },

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
    fontSize: 15,
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

  // Dialog
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

  // Radio button
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.header,
    marginRight: spacing.sm,
  },
  radioActive: {
    backgroundColor: colors.header,
  },
  radioLabel: { fontSize: 14, color: colors.textPrimary },

  // Field
  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
