import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DgisSource } from '@2gis/dgis-mobile-sdk-full';
import type { MapControllerOptionsInit } from '@2gis/dgis-mobile-sdk-full';
import type {
  ColorInit,
  Context,
  MapAppearance,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdkController } from '../sdk/SdkProvider';
import {
  createDgisSourceWorkingModeFromSettings,
  createGraphicsPresetFromSettings,
  createMapAppearanceFromSettings,
  createMapStyleFileFromSettings,
  getMapAppearanceLoadingBackground,
  type MapSettings,
} from '../settings';

interface UseDefaultMapOptionsConfig {
  mapAppearance?: MapAppearance;
}

// Default initial camera position: Moscow centre at city-block zoom.
const DEFAULT_POSITION = {
  point: {
    latitude: 55.760898,
    longitude: 37.620242,
  },
  zoom: 15,
};

export function useDefaultMapAppearance(): MapAppearance {
  const mapSettings = useDefaultMapSettings();

  return useMemo(
    () => createMapAppearanceFromSettings(mapSettings),
    [mapSettings],
  );
}

export function useDefaultMapSettings(): MapSettings {
  const { settings } = useSdkController();

  return settings.map;
}

export function useMapAppearanceLoadingBackground(
  mapAppearance: MapAppearance,
): ColorInit {
  const colorScheme = useColorScheme();

  return useMemo(
    () => getMapAppearanceLoadingBackground(mapAppearance, colorScheme),
    [colorScheme, mapAppearance],
  );
}

// Builds MapControllerOptions preset with the default 2GIS sources and a default
// camera position. Map settings control the source mode, graphics preset, and
// appearance. `overrides` can still replace base fields such as `sources` or
// `position`.
//
// Memoized by `context` and the `overrides` reference: if the caller passes a
// fresh object literal each render, the options instance is recreated. Wrap
// overrides in `useMemo` on the caller side when that matters.
export function useDefaultMapOptions(
  context: Context,
  overrides?: MapControllerOptionsInit,
  config?: UseDefaultMapOptionsConfig,
): MapControllerOptionsInit {
  const mapSettings = useDefaultMapSettings();
  const sourceWorkingMode = useMemo(
    () => createDgisSourceWorkingModeFromSettings(mapSettings),
    [mapSettings],
  );
  const graphicsPreset = useMemo(
    () => createGraphicsPresetFromSettings(mapSettings),
    [mapSettings],
  );
  const settingsMapAppearance = useMemo(
    () => createMapAppearanceFromSettings(mapSettings),
    [mapSettings],
  );
  const styleFile = useMemo(
    () => createMapStyleFileFromSettings(mapSettings),
    [mapSettings],
  );
  const mapAppearance = config?.mapAppearance ?? settingsMapAppearance;

  return useMemo(() => {
    const sources = overrides?.sources ?? [
      DgisSource.createDgisSource(context, sourceWorkingMode),
      DgisSource.createImmersiveDgisSource(context),
    ];

    return {
      position: DEFAULT_POSITION,
      ...overrides,
      sources,
      graphicsPreset,
      mapAppearance,
      styleFile: overrides?.styleFile ?? styleFile,
    };
  }, [
    context,
    graphicsPreset,
    mapAppearance,
    overrides,
    sourceWorkingMode,
    styleFile,
  ]);
}
