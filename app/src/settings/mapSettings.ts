import {
  BySystem,
  DgisSourceWorkingMode,
  File as SdkFile,
  Fixed,
  GraphicsPreset,
  MapAppearance,
  MapAppearanceKind,
  MapTheme,
  copyAppAssetToFile,
} from '@2gis/dgis-mobile-sdk-full';
import type { Color } from '@2gis/dgis-mobile-sdk-full';
import type { ColorSchemeName } from 'react-native';

import { isObjectRecord } from './utils';

export type MapThemeMode = 'system' | 'light' | 'dark';
export type MapSourceMode = 'online' | 'offline' | 'hybrid';
export type MapGraphicsPresetMode = 'light' | 'normal' | 'immersive';

export interface MapSettings {
  theme: MapThemeMode;
  mode: MapSourceMode;
  graphicsPreset: MapGraphicsPresetMode;
  styleFilePath: string;
}

export const defaultMapSettings: MapSettings = {
  theme: 'system',
  mode: 'hybrid',
  graphicsPreset: 'immersive',
  styleFilePath: '',
};

export const bundledCustomStyleAssetPath = 'map/custom_styles.2gis';

export const sdkMapThemeModes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export const sdkMapModeOptions = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

export const sdkMapGraphicsPresetOptions = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'immersive', label: 'Immersive' },
] as const;

const mapThemeModeValues = sdkMapThemeModes.map(mode => mode.value);
const mapSourceModeValues = sdkMapModeOptions.map(mode => mode.value);
const mapGraphicsPresetValues = sdkMapGraphicsPresetOptions.map(
  preset => preset.value,
);

export function readStoredMapSettings(
  source: unknown,
  legacyThemeSource?: unknown,
): MapSettings {
  const record = isObjectRecord(source) ? source : {};
  const legacyThemeRecord = isObjectRecord(legacyThemeSource)
    ? legacyThemeSource
    : {};

  return normalizeMapSettings({
    theme: getStoredMapThemeMode(record, legacyThemeRecord),
    mode: isMapSourceMode(record.mode)
      ? record.mode
      : isMapSourceMode(record.mapMode)
      ? record.mapMode
      : defaultMapSettings.mode,
    graphicsPreset: isMapGraphicsPresetMode(record.graphicsPreset)
      ? record.graphicsPreset
      : isMapGraphicsPresetMode(record.mapGraphicsPreset)
      ? record.mapGraphicsPreset
      : defaultMapSettings.graphicsPreset,
    styleFilePath:
      typeof record.styleFilePath === 'string'
        ? record.styleFilePath
        : typeof record.mapStyleFilePath === 'string'
        ? record.mapStyleFilePath
        : defaultMapSettings.styleFilePath,
  });
}

export function normalizeMapSettings(settings: MapSettings): MapSettings {
  return {
    theme: isMapThemeMode(settings.theme)
      ? settings.theme
      : defaultMapSettings.theme,
    mode: isMapSourceMode(settings.mode)
      ? settings.mode
      : defaultMapSettings.mode,
    graphicsPreset: isMapGraphicsPresetMode(settings.graphicsPreset)
      ? settings.graphicsPreset
      : defaultMapSettings.graphicsPreset,
    styleFilePath:
      typeof settings.styleFilePath === 'string'
        ? normalizeStyleFilePath(settings.styleFilePath)
        : defaultMapSettings.styleFilePath,
  };
}

export function createMapAppearanceFromSettings(
  settings: MapSettings,
): MapAppearance {
  return createMapAppearance(settings.theme);
}

export function createMapAppearance(mode: MapThemeMode): MapAppearance {
  const lightTheme = MapTheme.defaultTheme;
  const darkTheme = MapTheme.defaultDarkTheme;

  switch (mode) {
    case 'system':
      return MapAppearance.bySystem(
        new BySystem({ light: lightTheme, dark: darkTheme }),
      );
    case 'light':
      return MapAppearance.fixed(new Fixed({ theme: lightTheme }));
    case 'dark':
      return MapAppearance.fixed(new Fixed({ theme: darkTheme }));
  }
}

export function createDgisSourceWorkingModeFromSettings(
  settings: MapSettings,
): DgisSourceWorkingMode {
  switch (settings.mode) {
    case 'online':
      return DgisSourceWorkingMode.Online;
    case 'offline':
      return DgisSourceWorkingMode.Offline;
    case 'hybrid':
      return DgisSourceWorkingMode.HybridOnlineFirst;
  }
}

export function createGraphicsPresetFromSettings(
  settings: MapSettings,
): GraphicsPreset {
  switch (settings.graphicsPreset) {
    case 'light':
      return GraphicsPreset.Lite;
    case 'normal':
      return GraphicsPreset.Normal;
    case 'immersive':
      return GraphicsPreset.Immersive;
  }
}

export function createMapStyleFileFromSettings(
  settings: MapSettings,
): SdkFile | null {
  const styleFilePath = normalizeStyleFilePath(settings.styleFilePath);

  return styleFilePath ? new SdkFile(styleFilePath) : null;
}

export async function resolveMapStyleFilePath(path: string): Promise<string> {
  const normalized = normalizeStyleFilePath(path);

  if (!normalized || !isAppAssetStyleFilePath(normalized)) {
    return normalized;
  }

  return copyAppAssetToFile(normalized);
}

export function getMapAppearanceLoadingBackground(
  mapAppearance: MapAppearance,
  colorScheme: ColorSchemeName,
): Color {
  switch (mapAppearance.kind) {
    case MapAppearanceKind.BySystem:
      return colorScheme === 'dark'
        ? mapAppearance.value.dark.loadingBackground
        : mapAppearance.value.light.loadingBackground;
    case MapAppearanceKind.Fixed:
      return mapAppearance.value.theme.loadingBackground;
  }
}

function getStoredMapThemeMode(
  record: Record<string, unknown>,
  legacyThemeRecord: Record<string, unknown>,
): MapThemeMode {
  if (isMapThemeMode(record.theme)) {
    return record.theme;
  }
  if (isMapThemeMode(record.mapTheme)) {
    return record.mapTheme;
  }
  if (isMapThemeMode(legacyThemeRecord.theme)) {
    return legacyThemeRecord.theme;
  }
  if (isMapThemeMode(legacyThemeRecord.mode)) {
    return legacyThemeRecord.mode;
  }
  if (isMapThemeMode(legacyThemeRecord.mapThemeMode)) {
    return legacyThemeRecord.mapThemeMode;
  }

  return defaultMapSettings.theme;
}

function isMapThemeMode(value: unknown): value is MapThemeMode {
  return (
    typeof value === 'string' &&
    mapThemeModeValues.includes(value as MapThemeMode)
  );
}

function isMapSourceMode(value: unknown): value is MapSourceMode {
  return (
    typeof value === 'string' &&
    mapSourceModeValues.includes(value as MapSourceMode)
  );
}

function isMapGraphicsPresetMode(
  value: unknown,
): value is MapGraphicsPresetMode {
  return (
    typeof value === 'string' &&
    mapGraphicsPresetValues.includes(value as MapGraphicsPresetMode)
  );
}

const URI_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-z]:[\\/]/i;

function normalizeStyleFilePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.startsWith('file://')) {
    const withoutScheme = trimmed.slice('file://'.length);
    try {
      return decodeURI(withoutScheme);
    } catch {
      return withoutScheme;
    }
  }

  return trimmed;
}

function isAppAssetStyleFilePath(path: string): boolean {
  return (
    !path.startsWith('/') &&
    !WINDOWS_ABSOLUTE_PATH_PATTERN.test(path) &&
    !URI_SCHEME_PATTERN.test(path)
  );
}
