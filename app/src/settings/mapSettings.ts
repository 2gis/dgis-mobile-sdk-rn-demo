import {
  BySystem,
  File as SdkFile,
  Fixed,
  GraphicsPreset,
  MapAppearance,
  MapAppearanceKind,
  MapTheme,
} from '@2gis/dgis-mobile-sdk-map';
import type { Color } from '@2gis/dgis-mobile-sdk-map';
import type { ColorSchemeName } from 'react-native';

import { isObjectRecord } from './utils';

export type MapThemeMode = 'system' | 'light' | 'dark';
export type MapGraphicsPresetMode = 'light' | 'normal' | 'immersive';

export interface MapSettings {
  theme: MapThemeMode;
  graphicsPreset: MapGraphicsPresetMode;
  styleFilePath: string;
}

export const defaultMapSettings: MapSettings = {
  theme: 'system',
  graphicsPreset: 'immersive',
  styleFilePath: '',
};

export const sdkMapThemeModes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export const sdkMapGraphicsPresetOptions = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'immersive', label: 'Immersive' },
] as const;

const mapThemeModeValues = sdkMapThemeModes.map(mode => mode.value);
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

function isMapGraphicsPresetMode(
  value: unknown,
): value is MapGraphicsPresetMode {
  return (
    typeof value === 'string' &&
    mapGraphicsPresetValues.includes(value as MapGraphicsPresetMode)
  );
}

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
