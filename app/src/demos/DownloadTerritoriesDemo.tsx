import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CameraChangeReason,
  MapView,
  PackageManager,
  PackageUpdateStatus,
  TerritoryManager,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Camera as SdkCamera,
  Connection,
  Map as SdkMap,
  MapController,
  PackageInfo,
  Territory,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import {
  cardShadow,
  colors,
  radius as themeRadius,
  spacing,
} from '../theme/theme';
import { destroyIfPresent, isNativeDestroyedError } from './demoNativeCleanup';

type FilterMode = 'all' | 'position' | 'viewport';

function formatSize(bytes: bigint | null): string {
  if (bytes == null) {
    return 'Unknown size';
  }

  const mb = Number(bytes) / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function statusText(info: PackageInfo, progress: number): string {
  switch (info.updateStatus) {
    case PackageUpdateStatus.InProgress:
      return `Installing: ${progress}%`;
    case PackageUpdateStatus.Paused:
      return 'Paused';
    case PackageUpdateStatus.NotAvailable:
    default:
      return info.installed ? 'Installed' : 'Not installed';
  }
}

function matchesGeometryFilter(
  territory: Territory,
  allowedIds: ReadonlySet<string> | null,
): boolean {
  if (allowedIds == null) {
    return true;
  }

  return allowedIds.has(territory.id);
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

function TerritoryRow({ territory }: { territory: Territory }) {
  const [info, setInfo] = useState<PackageInfo>(territory.infoChannel.value);
  const [progress, setProgress] = useState<number>(
    territory.infoChannel.value.installed
      ? 100
      : territory.progressChannel.value,
  );

  useEffect(() => {
    setInfo(territory.infoChannel.value);
    setProgress(
      territory.infoChannel.value.installed
        ? 100
        : territory.progressChannel.value,
    );

    const infoConnection = territory.infoChannel.subscribe(setInfo);
    const progressConnection = territory.progressChannel.subscribe(setProgress);

    return () => {
      infoConnection.disconnect();
      progressConnection.disconnect();
    };
  }, [territory]);

  const showProgress = info.updateStatus === PackageUpdateStatus.InProgress;

  return (
    <View style={styles.territoryCard}>
      <View style={styles.territoryHeaderRow}>
        <Text style={styles.territoryName}>{info.name}</Text>
        <View style={styles.actionRow}>
          {info.installed && !info.preinstalled && (
            <Pressable
              style={styles.iconButton}
              onPress={() => territory.uninstall()}
            >
              <Text style={styles.iconButtonText}>Delete</Text>
            </Pressable>
          )}
          {(info.hasUpdate || info.incomplete) && (
            <Pressable
              style={styles.iconButton}
              onPress={() => territory.install()}
            >
              <Text style={styles.iconButtonText}>Install</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.statusText}>{statusText(info, progress)}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Size: {formatSize(info.finalSizeOnDisk)}
        </Text>
        {info.hasUpdate && <Text style={styles.metaTag}>Has update</Text>}
        {info.preinstalled && <Text style={styles.metaTag}>Preinstalled</Text>}
      </View>

      {showProgress && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(progress, 100))}%` },
            ]}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Demonstrates offline territory management: browsing, filtering by map
 * position/viewport, installing, and removing map packages.
 */
export function DownloadTerritoriesDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const territoryManagerRef = useRef<TerritoryManager | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterText, setFilterText] = useState('');
  const [geometryFilteredIds, setGeometryFilteredIds] =
    useState<ReadonlySet<string> | null>(null);

  const recomputeGeometryFilter = useCallback(() => {
    const territoryManager = territoryManagerRef.current;
    if (!mapController || !territoryManager || filterMode === 'all') {
      setGeometryFilteredIds(null);
      return;
    }

    try {
      if (filterMode === 'position') {
        const ids = withControllerMap(mapController, map =>
          withMapCamera(
            map,
            camera =>
              new Set(
                territoryManager
                  .findByPoint(camera.position.point)
                  .map(t => t.id),
              ),
          ),
        );
        setGeometryFilteredIds(ids);
        return;
      }

      const ids = withControllerMap(mapController, map =>
        withMapCamera(
          map,
          camera =>
            new Set(
              territoryManager.findByRect(camera.visibleRect).map(t => t.id),
            ),
        ),
      );
      setGeometryFilteredIds(ids);
    } catch (error) {
      if (!isNativeDestroyedError(error)) {
        throw error;
      }
    }
  }, [filterMode, mapController]);

  useEffect(() => {
    const packageManager = PackageManager.instance(context);
    packageManager.checkForUpdates();

    const territoryManager = TerritoryManager.instance(context);
    territoryManagerRef.current = territoryManager;

    const territoriesConnection = territoryManager.territoriesChannel.subscribe(
      list => {
        setTerritories([...list]);
      },
    );

    setTerritories([...territoryManager.territoriesChannel.value]);

    return () => {
      territoriesConnection.disconnect();
      territoryManagerRef.current = null;
    };
  }, [context]);

  useEffect(() => {
    if (!mapController) {
      return;
    }

    let mounted = true;
    const connections: Connection[] = [];
    const map = mapController.map;
    const camera = map.camera;

    connections.push(
      camera.changed.subscribe(change => {
        const reasons = change.changeReasons;
        if (
          (filterMode === 'position' &&
            reasons.has(CameraChangeReason.Position)) ||
          (filterMode === 'viewport' &&
            reasons.has(CameraChangeReason.VisibleRect))
        ) {
          if (mounted) {
            recomputeGeometryFilter();
          }
        }
      }),
    );

    recomputeGeometryFilter();

    return () => {
      mounted = false;
      for (const connection of connections) {
        connection.disconnect();
      }
      destroyIfPresent(camera);
      destroyIfPresent(map);
    };
  }, [filterMode, mapController, recomputeGeometryFilter]);

  const filteredTerritories = useMemo(() => {
    const normalizedFilter = filterText.trim().toLowerCase();

    return territories
      .filter(territory =>
        matchesGeometryFilter(territory, geometryFilteredIds),
      )
      .filter(territory => {
        if (normalizedFilter.length === 0) {
          return true;
        }

        return territory.infoChannel.value.name
          .toLowerCase()
          .includes(normalizedFilter);
      })
      .sort((a, b) => {
        const ai = a.infoChannel.value;
        const bi = b.infoChannel.value;

        if (ai.installed && !bi.installed) {
          return -1;
        }
        if (!ai.installed && bi.installed) {
          return 1;
        }

        return ai.name.localeCompare(bi.name);
      });
  }, [filterText, geometryFilteredIds, territories]);

  const clearFilter = useCallback(() => {
    setFilterText('');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView controllerState={controllerState} style={styles.map} />
      </View>

      <View style={styles.segmentedRow}>
        <Pressable
          style={[
            styles.segmentButton,
            filterMode === 'all' && styles.segmentButtonActive,
          ]}
          onPress={() => setFilterMode('all')}
        >
          <Text
            style={[
              styles.segmentButtonText,
              filterMode === 'all' && styles.segmentButtonTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segmentButton,
            filterMode === 'position' && styles.segmentButtonActive,
          ]}
          onPress={() => setFilterMode('position')}
        >
          <Text
            style={[
              styles.segmentButtonText,
              filterMode === 'position' && styles.segmentButtonTextActive,
            ]}
          >
            Position
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segmentButton,
            filterMode === 'viewport' && styles.segmentButtonActive,
          ]}
          onPress={() => setFilterMode('viewport')}
        >
          <Text
            style={[
              styles.segmentButtonText,
              filterMode === 'viewport' && styles.segmentButtonTextActive,
            ]}
          >
            Viewport
          </Text>
        </Pressable>
      </View>

      <View style={styles.filterCard}>
        <TextInput
          value={filterText}
          onChangeText={setFilterText}
          placeholder="Filter territories"
          placeholderTextColor={colors.textMuted}
          style={styles.filterInput}
        />
        {filterText.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearFilter}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredTerritories.map(territory => (
          <TerritoryRow key={territory.id} territory={territory} />
        ))}
        {filteredTerritories.length === 0 && (
          <Text style={styles.emptyText}>No territories found</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    height: 250,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  map: {
    flex: 1,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: themeRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segmentButtonActive: {
    backgroundColor: colors.accent,
  },
  segmentButtonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: colors.textInverse,
  },
  filterCard: {
    ...cardShadow,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.md,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterInput: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.sm,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  territoryCard: {
    ...cardShadow,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  territoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  territoryName: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconButtonText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  statusText: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  metaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metaTag: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
