import { Platform } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  type Permission,
} from 'react-native-permissions';

function getLocationPermission(): Permission {
  if (Platform.OS === 'ios') {
    return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
  }

  if (Platform.OS === 'android') {
    return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  }

  throw new Error(`Unsupported platform: ${Platform.OS}`);
}

function isGranted(status: string): boolean {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
}

export async function checkLocationPermissions(locationService: {
  onPermissionGranted: () => void;
}): Promise<boolean> {
  const permission = getLocationPermission();

  const currentStatus = await check(permission);

  if (isGranted(currentStatus)) {
    locationService.onPermissionGranted();
    return true;
  }

  if (currentStatus === RESULTS.BLOCKED) {
    return false;
  }

  const requestStatus = await request(permission);

  if (isGranted(requestStatus)) {
    locationService.onPermissionGranted();
    return true;
  }

  return false;
}
