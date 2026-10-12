import { Duration, HttpOptions } from '@2gis/dgis-mobile-sdk-full';

import { isObjectRecord, isPositiveInteger } from './utils';

export interface HttpOptionsSettings {
  timeoutMs: string;
  useCache: boolean;
  cacheStoragePath: string;
  cacheMaxSizeBytes: string;
}

export const defaultHttpOptionsSettings: HttpOptionsSettings = {
  timeoutMs: '15000',
  useCache: true,
  cacheStoragePath: '',
  cacheMaxSizeBytes: '',
};

export function readStoredHttpOptionsSettings(
  source: unknown,
): HttpOptionsSettings {
  const record = isObjectRecord(source) ? source : {};

  return normalizeHttpOptionsSettings({
    timeoutMs:
      typeof record.timeoutMs === 'string'
        ? record.timeoutMs
        : typeof record.httpTimeoutMs === 'string'
        ? record.httpTimeoutMs
        : defaultHttpOptionsSettings.timeoutMs,
    useCache:
      typeof record.useCache === 'boolean'
        ? record.useCache
        : typeof record.httpUseCache === 'boolean'
        ? record.httpUseCache
        : defaultHttpOptionsSettings.useCache,
    cacheStoragePath:
      typeof record.cacheStoragePath === 'string'
        ? record.cacheStoragePath
        : typeof record.httpCacheStoragePath === 'string'
        ? record.httpCacheStoragePath
        : defaultHttpOptionsSettings.cacheStoragePath,
    cacheMaxSizeBytes:
      typeof record.cacheMaxSizeBytes === 'string'
        ? record.cacheMaxSizeBytes
        : typeof record.httpCacheMaxSizeBytes === 'string'
        ? record.httpCacheMaxSizeBytes
        : defaultHttpOptionsSettings.cacheMaxSizeBytes,
  });
}

export function normalizeHttpOptionsSettings(
  settings: HttpOptionsSettings,
): HttpOptionsSettings {
  return {
    timeoutMs: settings.timeoutMs.trim(),
    useCache: settings.useCache,
    cacheStoragePath: settings.cacheStoragePath.trim(),
    cacheMaxSizeBytes: settings.cacheMaxSizeBytes.trim(),
  };
}

export function validateHttpOptionsSettings(
  settings: HttpOptionsSettings,
): string | null {
  const normalized = normalizeHttpOptionsSettings(settings);

  if (!isPositiveInteger(normalized.timeoutMs)) {
    return 'HTTP timeout must be a positive integer.';
  }

  if (
    normalized.cacheMaxSizeBytes.length > 0 &&
    !isPositiveInteger(normalized.cacheMaxSizeBytes)
  ) {
    return 'Cache max size must be a positive integer.';
  }

  return null;
}

export function createHttpOptionsFromSettings(
  settings: HttpOptionsSettings,
): HttpOptions {
  const normalized = normalizeHttpOptionsSettings(settings);

  return new HttpOptions({
    timeout: Duration.ofMilliseconds(Number(normalized.timeoutMs)),
    useCache: normalized.useCache,
    cacheStoragePath: normalized.cacheStoragePath || null,
    cacheMaxSize: normalized.cacheMaxSizeBytes
      ? BigInt(normalized.cacheMaxSizeBytes)
      : null,
  });
}
