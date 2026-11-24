import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import {
  AttributeValue,
  Circle,
  DgisMapObject,
  FormattingType,
  ImageLoader,
  MapObjectManager,
  MapView,
  Marker,
  RoadEventSource,
  SearchManager,
  SimpleMapObject,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  DirectoryObject,
  MapRenderedObjectObserver,
  RenderedObjectInfo,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useChannelEffect } from '../hooks/useChannelEffect';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { ErrorBanner } from '../components/ErrorBanner';
import { type DemoImageCache, loadPinMarkerImage } from './mapDemoAssets';
import {
  cardShadow,
  cardShadowElevated,
  colors,
  radius as themeRadius,
  spacing,
  typography,
} from '../theme/theme';

const INITIAL_POSITION = {
  point: {
    latitude: 55.75,
    longitude: 37.62,
  },
  zoom: 12,
};

// Stable overrides reference so useDefaultMapOptions memoizes — a fresh object literal
// each render would rebuild the native MapControllerOptions and its sources.
const MAP_OPTIONS_OVERRIDES = { position: INITIAL_POSITION };

/** Test circle that demonstrates adding an object to the map. */
function createTestCircle(): Circle {
  return new Circle({
    position: {
      latitude: 55.75,
      longitude: 37.62,
    },
    radius: 1900,
    color: { argb: 0x40ff0000 },
    strokeColor: { argb: 0xffff0000 },
    strokeWidth: 2,
    userData: { type: 'circle' },
  });
}

// Use a structural type, not GeoPoint: the formatter needs only latitude and
// longitude, so it accepts both GeoPoint and GeoPointWithElevation (closestMapPoint).
/** Formats a geo point as "(latitude, longitude)" with 6 decimal places. */
function formatGeoPoint(point: {
  latitude: number;
  longitude: number;
}): string {
  const lat = point.latitude.toFixed(6);
  const lon = point.longitude.toFixed(6);
  return `(${lat}, ${lon})`;
}

/**
 * Builds a human-readable description of the map object under the touch: class,
 * nearest screen and geo points, level id, and for DGIS and simple objects their
 * identifiers and geometry.
 */
function formatRenderedObjectInfo(info: RenderedObjectInfo): string {
  // info.item is the RenderedObject wrapper; info.item.item is the map object itself.
  const object = info.item.item;
  const viewport = info.closestViewportPoint;
  const lines: string[] = [
    `Class: ${object.constructor.name}`,
    `ClosestViewportPoint: (${viewport.x.toFixed(1)}, ${viewport.y.toFixed(
      1,
    )})`,
    `ClosestMapPoint: ${formatGeoPoint(info.closestMapPoint)}`,
    `LevelId: ${String(info.item.levelId ?? null)}`,
  ];

  if (object instanceof DgisMapObject) {
    lines.push(`DgisObjectId: ${object.id.objectId}`);
  }

  if (object instanceof SimpleMapObject) {
    lines.push(`UserData: ${JSON.stringify(object.userData)}`);
    lines.push(`zIndex: ${object.zIndex}`);
    lines.push(`Bounds NE: ${formatGeoPoint(object.bounds.northEastPoint)}`);
    lines.push(`Bounds SW: ${formatGeoPoint(object.bounds.southWestPoint)}`);
  }

  return lines.join('\n');
}

function formatDirectoryObject(obj: DirectoryObject): string {
  const lines: string[] = [];
  if (obj.title) lines.push(`Title: ${obj.title}`);
  if (obj.subtitle) lines.push(`Subtitle: ${obj.subtitle}`);
  if (obj.description) lines.push(`Description: ${obj.description}`);
  const address = obj.formattedAddress(FormattingType.Full);
  if (address) {
    const parts = [address.streetAddress, address.drilldownAddress]
      .filter(Boolean)
      .join(', ');
    if (parts) lines.push(`Address: ${parts}`);
  }
  return lines.length > 0 ? lines.join('\n') : 'No directory info';
}

/**
 * Identifies map objects through MapController.renderedObjectObserver.
 * Subscribes to tap and long-touch object channels and shows the first object
 * description (or a "no object" message). Subscriptions are released when the
 * observer changes, and pending search requests are released on unmount.
 */
function useObjectIdentification(
  renderedObjectObserver: MapRenderedObjectObserver | null,
  searchManager: SearchManager | null,
  onRenderedObject?: (info: RenderedObjectInfo | null) => void,
): string {
  const [info, setInfo] = useState('Tap map object to inspect it');
  const runSearchFuture = useLatestFuture();

  const identify = (results: RenderedObjectInfo[]) => {
    const rendered = results[0];
    if (!rendered) {
      onRenderedObject?.(null);
      setInfo('No rendered object under touch');
      return;
    }

    onRenderedObject?.(rendered);
    const baseInfo = formatRenderedObjectInfo(rendered);
    const object = rendered.item.item;

    if (object instanceof DgisMapObject && searchManager) {
      setInfo(baseInfo + '\n\nSearching directory...');
      runSearchFuture(
        searchManager.searchByDirectoryObjectIds([object.id]),
        directoryObjects => {
          const directoryObject = directoryObjects[0];
          if (directoryObject) {
            setInfo(
              baseInfo +
                '\n\n── Directory Info ──\n' +
                formatDirectoryObject(directoryObject),
            );
          } else {
            setInfo(baseInfo + '\n\nDirectory: not found');
          }
        },
        error => {
          setInfo(baseInfo + `\n\nDirectory error: ${String(error)}`);
        },
      );
    } else {
      setInfo(baseInfo);
    }
  };

  useChannelEffect(() => renderedObjectObserver?.objectTapped, identify);
  useChannelEffect(() => renderedObjectObserver?.objectLongTouched, identify);

  return info;
}

/**
 * Map objects identification demo. On tap and long-touch it shows the
 * RenderedObjectInfo received from the rendered object observer.
 * Toggles enable the road-events source (TUGC), the parking attribute, and a test
 * circle.
 */
export function MapObjectsIdentificationDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context, MAP_OPTIONS_OVERRIDES);
  const { controllerState, mapController } = useMapController(context, options);
  const imageLoaderRef = useRef<ImageLoader | null>(null);
  const imageCacheRef = useRef<DemoImageCache>(new Map());
  const selectedMarkerRef = useRef<Marker | null>(null);
  const selectionVersionRef = useRef(0);

  if (imageLoaderRef.current === null) {
    imageLoaderRef.current = new ImageLoader(context);
  }

  const searchManager = useMemo(
    () => SearchManager.createSmartManager(context),
    [context],
  );
  const [showInfo, setShowInfo] = useState(true);
  const manager = useMemo(
    () =>
      mapController ? new MapObjectManager(mapController.map, null) : null,
    [mapController],
  );
  const renderedObjectObserver = mapController?.renderedObjectObserver ?? null;
  const roadEventSource = useMemo(
    () => new RoadEventSource(context),
    [context],
  );
  const circle = useMemo(createTestCircle, []);

  const [isParkingEnabled, setIsParkingEnabled] = useState(false);
  const [isTugcEnabled, setIsTugcEnabled] = useState(false);
  const [isCircleEnabled, setIsCircleEnabled] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const removeSelectedMarker = useCallback(() => {
    const marker = selectedMarkerRef.current;
    if (!manager || !marker) {
      selectedMarkerRef.current = null;
      return;
    }

    manager.removeObjects([marker]);
    selectedMarkerRef.current = null;
  }, [manager]);

  const handleRenderedObject = useCallback(
    (rendered: RenderedObjectInfo | null) => {
      if (!manager) {
        return;
      }

      if (!rendered) {
        removeSelectedMarker();
        return;
      }

      const object = rendered.item.item;
      if (!(object instanceof DgisMapObject)) {
        return;
      }

      void (async () => {
        try {
          const currentMarker = selectedMarkerRef.current;
          if (currentMarker) {
            currentMarker.position = rendered.closestMapPoint;
            return;
          }

          const requestVersion = selectionVersionRef.current;
          const icon = await loadPinMarkerImage(
            imageLoaderRef.current!,
            imageCacheRef.current,
          );

          if (requestVersion !== selectionVersionRef.current || !manager) {
            return;
          }

          if (selectedMarkerRef.current) {
            selectedMarkerRef.current.position = rendered.closestMapPoint;
            return;
          }

          const marker = new Marker({
            icon,
            position: rendered.closestMapPoint,
            anchor: { y: 1 },
            iconWidth: 5,
          });
          selectedMarkerRef.current = marker;
          manager.addObject(marker);
        } catch (error) {
          setToggleError(`Selection marker failed: ${String(error)}`);
        }
      })();
    },
    [manager, removeSelectedMarker],
  );

  useEffect(() => {
    selectionVersionRef.current += 1;

    return () => {
      selectionVersionRef.current += 1;
      removeSelectedMarker();
    };
  }, [removeSelectedMarker]);

  const objectInfo = useObjectIdentification(
    renderedObjectObserver,
    searchManager,
    handleRenderedObject,
  );

  // Toggles: do the SDK side effect first, and flip the flag only on success. The
  // error goes to a separate banner, not the identification card — they are different.
  const handleTugcToggle = (value: boolean) => {
    if (!mapController || !roadEventSource) {
      return;
    }
    try {
      if (value) {
        mapController.map.addSource(roadEventSource);
      } else {
        mapController.map.removeSource(roadEventSource);
      }
      setIsTugcEnabled(value);
      setToggleError(null);
    } catch (e) {
      setToggleError(`TUGC toggle failed: ${String(e)}`);
    }
  };

  const handleParkingToggle = (value: boolean) => {
    if (!mapController) {
      return;
    }
    try {
      mapController.map.attributes.setAttributeValue(
        'parkingOn',
        AttributeValue.boolean(value),
      );
      setIsParkingEnabled(value);
      setToggleError(null);
    } catch (e) {
      setToggleError(`Parking toggle failed: ${String(e)}`);
    }
  };

  const handleCircleToggle = (value: boolean) => {
    if (!manager || !circle) {
      return;
    }
    try {
      if (value) {
        manager.addObject(circle);
      } else {
        manager.removeObjects([circle]);
      }
      setIsCircleEnabled(value);
      setToggleError(null);
    } catch (e) {
      setToggleError(`Circle toggle failed: ${String(e)}`);
    }
  };

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />

      <View style={styles.topOverlay} pointerEvents="box-none">
        {toggleError ? <ErrorBanner text={toggleError} /> : null}
        {showInfo && (
          <View style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>RenderedObjectInfo</Text>
              <TouchableOpacity
                onPress={() => setShowInfo(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.logText}>{objectInfo}</Text>
          </View>
        )}
        {!showInfo && (
          <TouchableOpacity
            style={styles.showInfoButton}
            onPress={() => setShowInfo(true)}
          >
            <Text style={styles.showInfoButtonText}>Show info</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.controlsCard}>
        <SwitchRow
          label="TUGC enable"
          value={isTugcEnabled}
          onChange={handleTugcToggle}
        />
        <SwitchRow
          label="Show parking"
          value={isParkingEnabled}
          onChange={handleParkingToggle}
        />
        <SwitchRow
          label="Show circle"
          value={isCircleEnabled}
          onChange={handleCircleToggle}
        />
      </View>
    </View>
  );
}

interface SwitchRowProps {
  /** Text to the left of the switch. */
  label: string;
  /** Current switch state. */
  value: boolean;
  /** Called with the new value when toggled. */
  onChange: (value: boolean) => void;
}

/** Control-panel row: label on the left, switch on the right. */
function SwitchRow({ label, value, onChange }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  logCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    padding: spacing.sm,
    ...cardShadow,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  closeButton: {
    ...typography.body,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  logText: {
    ...typography.small,
    color: colors.textMuted,
  },
  showInfoButton: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    ...cardShadow,
  },
  showInfoButtonText: {
    ...typography.label,
    color: colors.accent,
  },

  controlsCard: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    overflow: 'hidden',
    ...cardShadowElevated,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  switchLabel: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },
});
