import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapView,
  ZoomControl,
  CompassControl,
  TrafficControl,
  IndoorControl,
  MyLocationControl,
  MyLocationControllerSettings,
  MyLocationMapObjectMarkerType,
  MyLocationMapObjectSource,
  defaultMapControlsColors,
  makeZoomControlColors,
  makeCompassControlColors,
  makeTrafficControlColors,
  makeIndoorControlColors,
  makeMyLocationControlColors,
  type MapControlsColors,
  type Map as SdkMap,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useInitializeLocationService } from '../hooks/useInitializeLocationService';
import { useNative } from '../hooks/useNative';
import { isNativeDestroyedError } from '../hooks/nativeObjectLifecycle';
import { checkLocationPermissions } from '../sdk/locationPermissions';
import {
  colors as themeColors,
  radius,
  spacing,
  typography,
} from '../theme/theme';

const customColors: MapControlsColors = {
  background: 'rgba(0,0,0,0.8)',
  transparentBackground: 'rgba(0,0,0,0.2)',
  primaryContent: '#FFFFFF',
  tertiaryContent: 'rgba(255,255,255,0.4)',
  quaternaryContent: 'rgba(255,255,255,0.3)',
  activeContent: '#5AC8FA', // systemTeal
  lowAlert: '#34C759',
  mediumAlert: '#FFCC00',
  highAlert: '#FF3B30',
};

type ThemeMode = 'default' | 'custom';

const CONTROL_SIZE = 44;
const CONTROL_GAP = 8;
const CONTROL_PADDING = 12;
const ZOOM_HEIGHT = CONTROL_SIZE * 2 + StyleSheet.hairlineWidth;
const FULL_LAYOUT_HEIGHT = CONTROL_SIZE * 8 + CONTROL_GAP * 5;

function deriveAllColors(base: MapControlsColors) {
  return {
    zoom: makeZoomControlColors(base),
    compass: makeCompassControlColors(base),
    traffic: makeTrafficControlColors(base),
    indoor: makeIndoorControlColors(base),
    myLocation: makeMyLocationControlColors(base),
  };
}

// ---------------------------------------------------------------------------
// Settings screen
// ---------------------------------------------------------------------------

interface Settings {
  themeMode: ThemeMode;
  showIndoorOverview: boolean;
}

function SettingsScreen({ onApply }: { onApply: (s: Settings) => void }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('default');
  const [showIndoorOverview, setShowIndoorOverview] = useState(true);

  return (
    <ScrollView style={settingsStyles.container}>
      <Text style={settingsStyles.sectionHeader}>Theme</Text>
      <View style={settingsStyles.segmentRow}>
        {(['default', 'custom'] as ThemeMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[
              settingsStyles.segment,
              themeMode === mode && settingsStyles.segmentActive,
            ]}
            onPress={() => setThemeMode(mode)}
          >
            <Text
              style={[
                settingsStyles.segmentText,
                themeMode === mode && settingsStyles.segmentTextActive,
              ]}
            >
              {mode === 'default' ? 'Default' : 'Custom'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={settingsStyles.sectionHeader}>Indoor</Text>
      <View style={settingsStyles.row}>
        <Text style={settingsStyles.rowLabel}>Use indoor overview</Text>
        <Switch
          value={showIndoorOverview}
          onValueChange={setShowIndoorOverview}
        />
      </View>

      <TouchableOpacity
        style={settingsStyles.applyButton}
        onPress={() => onApply({ themeMode, showIndoorOverview })}
      >
        <Text style={settingsStyles.applyText}>Apply</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Map screen with controls
// ---------------------------------------------------------------------------

function MapWithControls({ settings }: { settings: Settings }) {
  const insets = useSafeAreaInsets();
  const [mapHeight, setMapHeight] = useState(0);
  const availableHeight = Math.max(
    0,
    mapHeight - insets.bottom - CONTROL_PADDING * 2,
  );
  const compact = availableHeight < FULL_LAYOUT_HEIGHT;
  const context = useSdk();
  const locationService = useInitializeLocationService();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const map = useNative<SdkMap>(
    () => mapController?.map ?? null,
    [mapController],
  );

  const myLocationSource = useNative<MyLocationMapObjectSource>(
    () =>
      new MyLocationMapObjectSource(
        context,
        new MyLocationControllerSettings({}),
        MyLocationMapObjectMarkerType.Model,
      ),
    [context],
  );

  const palette =
    settings.themeMode === 'custom' ? customColors : defaultMapControlsColors;
  const controlColors = deriveAllColors(palette);

  const handlePermissionRequest = useCallback(() => {
    if (!locationService) return;
    checkLocationPermissions(locationService).catch((e: unknown) => {
      console.warn('Location permission error:', e);
    });
  }, [locationService]);

  useEffect(() => {
    if (!map || !myLocationSource) {
      return;
    }

    map.addSource(myLocationSource);

    return () => {
      try {
        map.removeSource(myLocationSource);
      } catch (error) {
        if (!isNativeDestroyedError(error)) {
          throw error;
        }
      }
    };
  }, [map, myLocationSource]);

  return (
    <View
      style={styles.container}
      onLayout={event => setMapHeight(event.nativeEvent.layout.height)}
    >
      <MapView
        controllerState={controllerState}
        style={styles.map}
        copyrightAlignment="bottomLeft"
      />

      {map && compact ? (
        <View
          pointerEvents="box-none"
          style={[styles.controlsLayer, { bottom: insets.bottom }]}
        >
          <View pointerEvents="box-none" style={styles.compactIndoor}>
            <IndoorControl
              map={map}
              showOverview={settings.showIndoorOverview}
              colors={controlColors.indoor}
            />
          </View>

          <ScrollView
            pointerEvents="box-none"
            style={styles.compactRight}
            contentContainerStyle={styles.compactRightContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View pointerEvents="box-none" style={styles.compactTraffic}>
              <TrafficControl map={map} colors={controlColors.traffic} />
            </View>
            <View pointerEvents="box-none" style={styles.compactUpper}>
              <ZoomControl map={map} colors={controlColors.zoom} />
            </View>
            <View pointerEvents="box-none" style={styles.compactBottom}>
              <CompassControl map={map} colors={controlColors.compass} />
              <MyLocationControl
                map={map}
                colors={controlColors.myLocation}
                onPermissionRequest={handlePermissionRequest}
              />
            </View>
          </ScrollView>
        </View>
      ) : map ? (
        <View
          pointerEvents="box-none"
          style={[styles.controlsLayer, { bottom: insets.bottom }]}
        >
          <TrafficControl map={map} colors={controlColors.traffic} />

          <View pointerEvents="none" style={styles.spacer} />

          <View pointerEvents="box-none" style={styles.centerRow}>
            <IndoorControl
              map={map}
              showOverview={settings.showIndoorOverview}
              colors={controlColors.indoor}
            />
            <View pointerEvents="none" style={styles.spacer} />
            <ZoomControl map={map} colors={controlColors.zoom} />
          </View>

          <View pointerEvents="none" style={styles.spacer} />

          <CompassControl map={map} colors={controlColors.compass} />
          <MyLocationControl
            map={map}
            colors={controlColors.myLocation}
            onPermissionRequest={handlePermissionRequest}
          />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Demo entry point (settings → apply → map)
// ---------------------------------------------------------------------------

/** Map controls demo with theme customization. */
export function MapControlsDemo() {
  const [settings, setSettings] = useState<Settings | null>(null);

  if (!settings) {
    return <SettingsScreen onApply={setSettings} />;
  }

  return <MapWithControls settings={settings} />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controlsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: CONTROL_PADDING,
    alignItems: 'flex-end',
    gap: CONTROL_GAP,
  },
  compactIndoor: {
    position: 'absolute',
    left: CONTROL_PADDING - 4,
    top: CONTROL_PADDING,
    bottom: CONTROL_PADDING + 30,
    width: CONTROL_SIZE + 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  compactRight: {
    flex: 1,
    width: CONTROL_SIZE * 2 + CONTROL_GAP + 8,
    marginRight: -4,
  },
  compactRightContent: {
    flexGrow: 1,
    padding: 4,
    gap: CONTROL_GAP,
  },
  compactUpper: {
    flexGrow: 1,
    flexShrink: 0,
    minHeight: ZOOM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  compactTraffic: {
    alignSelf: 'flex-end',
    flexShrink: 0,
  },
  compactBottom: {
    flexDirection: 'row',
    gap: CONTROL_GAP,
    flexShrink: 0,
  },
  spacer: {
    flex: 1,
  },
  centerRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
});

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
    padding: spacing.lg,
  },
  sectionHeader: {
    ...typography.subtitle,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: themeColors.divider,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: themeColors.header,
    borderRadius: radius.md,
  },
  segmentText: {
    ...typography.label,
    color: themeColors.textPrimary,
  },
  segmentTextActive: {
    color: themeColors.textInverse,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: themeColors.textPrimary,
  },
  applyButton: {
    marginTop: spacing.xl,
    backgroundColor: themeColors.header,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyText: {
    ...typography.label,
    color: themeColors.textInverse,
    fontWeight: '600',
  },
});
