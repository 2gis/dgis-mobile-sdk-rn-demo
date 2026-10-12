import { useEffect } from 'react';
import { useMapController as useSdkMapController } from '@2gis/dgis-mobile-sdk-full';
import type {
  Context,
  MapController,
  MapControllerOptions,
  MapControllerState,
} from '@2gis/dgis-mobile-sdk-full';
import {
  destroyIfPresent,
  ignoreNativeDestroyedError,
} from './nativeObjectLifecycle';

/**
 * Demo-app convenience over the SDK's useMapController.
 *
 * The public SDK hook publishes the controller but does not destroy a ready
 * controller implicitly. Demo screens create throwaway maps while navigating
 * between examples, so this adapter exposes the same controllerState shape for
 * MapView, pre-extracts the ready controller and destroys it after consumers
 * have had a chance to clean their own map resources.
 */
export function useMapController(
  context: Context,
  options: MapControllerOptions,
): {
  controllerState: MapControllerState;
  mapController: MapController | null;
} {
  const controllerState = useSdkMapController(context, options);
  const mapController =
    controllerState.status === 'ready' ? controllerState.controller : null;

  useEffect(() => {
    if (mapController === null) {
      return;
    }

    return () => {
      setTimeout(() => {
        ignoreNativeDestroyedError(() => {
          destroyIfPresent(mapController);
        });
      }, 0);
    };
  }, [mapController]);

  return { controllerState, mapController };
}
