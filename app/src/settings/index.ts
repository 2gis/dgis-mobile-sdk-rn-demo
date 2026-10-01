import {
  createHttpOptionsFromSettings,
  defaultHttpOptionsSettings,
  normalizeHttpOptionsSettings,
  readStoredHttpOptionsSettings,
  validateHttpOptionsSettings,
  type HttpOptionsSettings,
} from './httpOptionsSettings';
import {
  defaultLocationOptionsSettings,
  normalizeLocationOptionsSettings,
  readStoredLocationOptionsSettings,
  type LocationOptionsSettings,
} from './locationOptionsSettings';
import {
  createLogOptionsFromSettings,
  defaultLogOptionsSettings,
  normalizeLogOptionsSettings,
  readStoredLogOptionsSettings,
  sdkLogLevels,
  type LogOptionsSettings,
} from './logOptionsSettings';
import {
  createGraphicsPresetFromSettings,
  createMapAppearance,
  createMapAppearanceFromSettings,
  createMapStyleFileFromSettings,
  defaultMapSettings,
  getMapAppearanceLoadingBackground,
  normalizeMapSettings,
  readStoredMapSettings,
  sdkMapGraphicsPresetOptions,
  sdkMapThemeModes,
  type MapGraphicsPresetMode,
  type MapSettings,
  type MapThemeMode,
} from './mapSettings';
import { isObjectRecord } from './utils';

export interface SdkSettings {
  http: HttpOptionsSettings;
  log: LogOptionsSettings;
  location: LocationOptionsSettings;
  map: MapSettings;
}

export const defaultSdkSettings: SdkSettings = {
  http: defaultHttpOptionsSettings,
  log: defaultLogOptionsSettings,
  location: defaultLocationOptionsSettings,
  map: defaultMapSettings,
};

export const sdkSettingsStorageKey =
  '@native-sdk/react-app/sdk-context-settings';

export function readStoredSdkSettings(raw: string | null): SdkSettings {
  if (!raw) {
    return defaultSdkSettings;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const record = isObjectRecord(parsed) ? parsed : {};

    return normalizeSdkSettings({
      http: readStoredHttpOptionsSettings(record.http ?? record),
      log: readStoredLogOptionsSettings(record.log ?? record),
      location: readStoredLocationOptionsSettings(record.location ?? record),
      map: readStoredMapSettings(
        record.map ?? record,
        record.mapTheme ?? record,
      ),
    });
  } catch {
    return defaultSdkSettings;
  }
}

export function serializeSdkSettings(settings: SdkSettings): string {
  return JSON.stringify(normalizeSdkSettings(settings));
}

export function normalizeSdkSettings(settings: SdkSettings): SdkSettings {
  return {
    http: normalizeHttpOptionsSettings(settings.http),
    log: normalizeLogOptionsSettings(settings.log),
    location: normalizeLocationOptionsSettings(settings.location),
    map: normalizeMapSettings(settings.map ?? defaultMapSettings),
  };
}

export function validateSdkSettings(settings: SdkSettings): string | null {
  return validateHttpOptionsSettings(settings.http);
}

export {
  createGraphicsPresetFromSettings,
  createMapAppearance,
  createMapAppearanceFromSettings,
  createMapStyleFileFromSettings,
  createHttpOptionsFromSettings,
  createLogOptionsFromSettings,
  getMapAppearanceLoadingBackground,
  sdkMapGraphicsPresetOptions,
  sdkMapThemeModes,
  sdkLogLevels,
};

export type {
  HttpOptionsSettings,
  LocationOptionsSettings,
  LogOptionsSettings,
  MapGraphicsPresetMode,
  MapSettings,
  MapThemeMode,
};
