import { useMapController as useSdkMapController } from '@2gis/dgis-mobile-sdk-full';
import type {
  Context,
  MapController,
  MapControllerOptionsInit,
  MapControllerState,
} from '@2gis/dgis-mobile-sdk-full';

/**
 * Wraps useSdkMapController for the demos and also returns the controller once it is ready, otherwise null.
 */
export function useMapController(
  context: Context,
  options: MapControllerOptionsInit,
): {
  controllerState: MapControllerState;
  mapController: MapController | null;
} {
  const controllerState = useSdkMapController(context, options);
  const mapController =
    controllerState.status === 'ready' ? controllerState.controller : null;
  return { controllerState, mapController };
}
