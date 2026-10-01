import { isBoolean, isObjectRecord } from './utils';

export interface LocationOptionsSettings {
  useCustomLocationProvider: boolean;
  useCustomHeadingProvider: boolean;
}

export const defaultLocationOptionsSettings: LocationOptionsSettings = {
  useCustomLocationProvider: false,
  useCustomHeadingProvider: false,
};

export function readStoredLocationOptionsSettings(
  source: unknown,
): LocationOptionsSettings {
  const record = isObjectRecord(source) ? source : {};

  return normalizeLocationOptionsSettings({
    useCustomLocationProvider: isBoolean(record.useCustomLocationProvider)
      ? record.useCustomLocationProvider
      : isBoolean(record.locationUseCustomLocationProvider)
      ? record.locationUseCustomLocationProvider
      : defaultLocationOptionsSettings.useCustomLocationProvider,
    useCustomHeadingProvider: isBoolean(record.useCustomHeadingProvider)
      ? record.useCustomHeadingProvider
      : isBoolean(record.locationUseCustomHeadingProvider)
      ? record.locationUseCustomHeadingProvider
      : defaultLocationOptionsSettings.useCustomHeadingProvider,
  });
}

export function normalizeLocationOptionsSettings(
  settings: LocationOptionsSettings,
): LocationOptionsSettings {
  return {
    useCustomLocationProvider: isBoolean(settings.useCustomLocationProvider)
      ? settings.useCustomLocationProvider
      : defaultLocationOptionsSettings.useCustomLocationProvider,
    useCustomHeadingProvider: isBoolean(settings.useCustomHeadingProvider)
      ? settings.useCustomHeadingProvider
      : defaultLocationOptionsSettings.useCustomHeadingProvider,
  };
}
