import { ScreenPoint } from '@2gis/dgis-mobile-sdk-map';
import type {
  Camera as SdkCamera,
  GeoPoint,
  Map as SdkMap,
  Projection as SdkProjection,
} from '@2gis/dgis-mobile-sdk-map';
import { destroyIfPresent } from '../../demoNativeCleanup';

export function withCamera<T>(
  sdkMap: SdkMap,
  action: (camera: SdkCamera) => T,
): T {
  const camera = sdkMap.camera;
  try {
    return action(camera);
  } finally {
    destroyIfPresent(camera);
  }
}

export function withProjection<T>(
  sdkMap: SdkMap,
  action: (projection: SdkProjection) => T,
): T {
  return withCamera(sdkMap, camera => {
    const projection = camera.projection;
    try {
      return action(projection);
    } finally {
      destroyIfPresent(projection);
    }
  });
}

export function centerScreenPoint(map: SdkMap): ScreenPoint {
  const size = withCamera(map, camera => camera.size);
  return new ScreenPoint({ x: size.width / 2, y: size.height / 2 });
}

export function randomScreenPointNear(map: SdkMap): ScreenPoint {
  const size = withCamera(map, camera => camera.size);
  const minY = size.height / 3;
  const maxY = size.height - size.height / 3;
  return new ScreenPoint({
    x: Math.random() * size.width,
    y: minY + Math.random() * (maxY - minY),
  });
}

export function randomScreenPointsNear(
  map: SdkMap,
  count: number,
): ScreenPoint[] {
  const points: ScreenPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push(randomScreenPointNear(map));
  }
  return points;
}

export function mapScreenPoints(
  map: SdkMap,
  screenPoints: ScreenPoint[],
): GeoPoint[] {
  const points: GeoPoint[] = [];
  withProjection(map, projection => {
    for (const screenPoint of screenPoints) {
      const point = projection.screenToMap(screenPoint);
      if (point) points.push(point);
    }
  });
  return points;
}
