import { useEffect, useState } from 'react';
import { LocationService } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { checkLocationPermissions } from '../sdk/locationPermissions';

export function useInitializeLocationService(
  checkPermissionsOnMount = true,
): LocationService | null {
  const sdkContext = useSdk();
  const [locationService, setLocationService] =
    useState<LocationService | null>(null);

  useEffect(() => {
    const createdLocationService = new LocationService(sdkContext);
    setLocationService(createdLocationService);

    if (checkPermissionsOnMount) {
      checkLocationPermissions(createdLocationService).catch(
        (error: unknown) => {
          console.warn('Failed to check location permissions:', error);
        },
      );
    }

    return () => {
      setLocationService(current =>
        current === createdLocationService ? null : current,
      );
    };
  }, [checkPermissionsOnMount, sdkContext]);

  return locationService;
}
