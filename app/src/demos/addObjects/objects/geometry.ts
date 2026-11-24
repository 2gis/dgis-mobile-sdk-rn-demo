import { ScreenPoint } from '@2gis/dgis-mobile-sdk-full';
import type { GeoPoint, Map as SdkMap } from '@2gis/dgis-mobile-sdk-full';

export function centerScreenPoint(map: SdkMap): ScreenPoint {
  const size = map.camera.size;
  return { x: size.width / 2, y: size.height / 2 };
}

export function randomScreenPointNear(map: SdkMap): ScreenPoint {
  const size = map.camera.size;
  const minY = size.height / 3;
  const maxY = size.height - size.height / 3;
  return {
    x: Math.random() * size.width,
    y: minY + Math.random() * (maxY - minY),
  };
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
  const projection = map.camera.projection;
  return screenPoints.flatMap(point => projection.screenToMap(point) ?? []);
}
