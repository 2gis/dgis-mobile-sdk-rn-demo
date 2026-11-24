import { use, useMemo } from 'react';
import {
  copyAppAssetToFile,
  DgisSource,
  File,
  GraphicsPreset,
} from '@2gis/dgis-mobile-sdk-full';
import type { Context, MapAppearance } from '@2gis/dgis-mobile-sdk-full';
import { useMapController } from './useMapController';

const MINI_MAP_STYLE_ASSET = 'map/navigation_minimap.2gis';

let miniMapStylePath: Promise<string> | null = null;

function loadMiniMapStylePath(): Promise<string> {
  miniMapStylePath ??= copyAppAssetToFile(MINI_MAP_STYLE_ASSET).catch(
    (error: unknown) => {
      miniMapStylePath = null;
      throw error;
    },
  );
  return miniMapStylePath;
}

/** Demo owner of the second map. The navigation control only borrows it. */
export function useNavigationMiniMap(
  context: Context,
  appearance: MapAppearance,
): ReturnType<typeof useMapController> {
  const path = use(loadMiniMapStylePath());
  const options = useMemo(
    () => ({
      styleFile: new File(path),
      sources: [DgisSource.createDgisSource(context)],
      graphicsPreset: GraphicsPreset.Lite,
      mapAppearance: appearance,
    }),
    [context, appearance, path],
  );
  return useMapController(context, options);
}
