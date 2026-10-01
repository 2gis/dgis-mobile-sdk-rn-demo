import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  CameraPosition,
  DgisSource,
  GeoPoint,
  MapControllerOptions,
} from '@2gis/dgis-mobile-sdk-map';
import type { Color, Context, MapAppearance } from '@2gis/dgis-mobile-sdk-map';
import type { Source } from '@2gis/dgis-mobile-sdk-map';
import { useSdkController } from '../sdk/SdkProvider';
import {
  createGraphicsPresetFromSettings,
  createMapAppearanceFromSettings,
  createMapStyleFileFromSettings,
  getMapAppearanceLoadingBackground,
  type MapSettings,
} from '../settings';
import { destroyAll } from './nativeObjectLifecycle';

// Constructor shape of the generated MapControllerOptions class — derived from
// the class itself so new fields appear here automatically.
export type MapControllerOptionsInit = ConstructorParameters<
  typeof MapControllerOptions
>[0];

interface UseDefaultMapOptionsConfig {
  mapAppearance?: MapAppearance;
}

interface MapOptionsState {
  options: MapControllerOptions;
  ownedSources: Source[];
}

// Default initial camera position: Moscow centre at city-block zoom.
const DEFAULT_POSITION = new CameraPosition({
  point: new GeoPoint({
    latitude: { value: 55.760898 },
    longitude: { value: 37.620242 },
  }),
  zoom: { value: 15 },
});

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
): Color {
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
// Default Source handles are native objects owned by this hook, so they are
// destroyed when options are recreated or the demo unmounts.
//
// Memoized by `context` and the `overrides` reference: if the caller passes a
// fresh object literal each render, the options instance is recreated. Wrap
// overrides in `useMemo` on the caller side when that matters.
export function useDefaultMapOptions(
  context: Context,
  overrides?: MapControllerOptionsInit,
  config?: UseDefaultMapOptionsConfig,
): MapControllerOptions {
  const mapSettings = useDefaultMapSettings();
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

  const mapOptionsState = useMemo<MapOptionsState>(() => {
    const overrideSources = overrides?.sources;
    const ownedSources =
      overrideSources === undefined
        ? [
            DgisSource.createDgisSource(context),
            DgisSource.createImmersiveDgisSource(context),
          ]
        : [];

    return {
      options: new MapControllerOptions({
        position: DEFAULT_POSITION,
        ...overrides,
        sources: overrideSources ?? ownedSources,
        graphicsPreset,
        mapAppearance,
        styleFile: overrides?.styleFile ?? styleFile,
      }),
      ownedSources,
    };
  }, [context, graphicsPreset, mapAppearance, overrides, styleFile]);

  useEffect(() => {
    const { ownedSources } = mapOptionsState;
    return () => destroyAll(ownedSources);
  }, [mapOptionsState]);

  return mapOptionsState.options;
}
