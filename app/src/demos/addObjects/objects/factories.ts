import {
  Circle,
  Marker,
  ModelMapObject,
  ModelSize,
  Polygon,
  Polyline,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  GeoPoint,
  Image as SdkImage,
  ModelData as SdkModelData,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  CircleSettings,
  MarkerSettings,
  ModelSettings,
  PolygonSettings,
  PolylineSettings,
} from './types';

export type AddObjectResult<T> = { ok: true; object: T } | { ok: false };

export function createCircleObject(
  settings: CircleSettings,
  position: GeoPoint,
): AddObjectResult<Circle> {
  const radius = parseFloat(settings.radius);
  const strokeWidth = parseFloat(settings.strokeWidth);
  const zIndex = parseInt(settings.zIndex, 10);
  if (hasInvalidNumber(radius, strokeWidth, zIndex)) {
    return { ok: false };
  }

  return {
    ok: true,
    object: new Circle({
      position,
      radius: radius,
      color: { argb: settings.color },
      strokeWidth: strokeWidth,
      strokeColor: { argb: settings.strokeColor },
      zIndex: zIndex,
      userData: settings.userData ? { id: settings.userData } : null,
    }),
  };
}

export function createMarkerObject(
  settings: MarkerSettings,
  position: GeoPoint,
  icon: SdkImage,
): AddObjectResult<Marker> {
  const elevation = parseFloat(settings.elevation);
  const iconWidth = parseFloat(settings.iconWidth);
  const zIndex = parseInt(settings.zIndex, 10);
  if (hasInvalidNumber(elevation, iconWidth, zIndex)) {
    return { ok: false };
  }

  return {
    ok: true,
    object: new Marker({
      position: {
        latitude: position.latitude,
        longitude: position.longitude,
        elevation: elevation,
      },
      icon,
      text: settings.text || null,
      iconWidth: iconWidth,
      zIndex: zIndex,
      userData: settings.userData ? { id: settings.userData } : null,
    }),
  };
}

export function createModelObject(
  settings: ModelSettings,
  position: GeoPoint,
  data: SdkModelData,
): AddObjectResult<ModelMapObject> {
  const size = parseFloat(settings.size);
  if (hasInvalidNumber(size)) {
    return { ok: false };
  }

  return {
    ok: true,
    object: new ModelMapObject({
      position: {
        latitude: position.latitude,
        longitude: position.longitude,
      },
      data,
      size: settings.scaleEnabled
        ? ModelSize.scale(size)
        : ModelSize.logicalPixel(size),
      userData: settings.userData ? { value: settings.userData } : null,
    }),
  };
}

export function getPolylinePointCount(
  settings: PolylineSettings,
): number | null {
  return getPointCount(settings.pointCount, 2);
}

export function createPolylineObject(
  settings: PolylineSettings,
  points: GeoPoint[],
): AddObjectResult<Polyline> {
  const width = parseFloat(settings.width);
  const zIndex = parseInt(settings.zIndex, 10);
  if (points.length < 2 || hasInvalidNumber(width, zIndex)) {
    return { ok: false };
  }

  return {
    ok: true,
    object: new Polyline({
      points,
      width: width,
      color: { argb: settings.color },
      zIndex: zIndex,
      userData: settings.userData ? { id: settings.userData } : null,
    }),
  };
}

export function getPolygonPointCount(settings: PolygonSettings): number | null {
  return getPointCount(settings.pointCount, 3);
}

export function createPolygonObject(
  settings: PolygonSettings,
  points: GeoPoint[],
): AddObjectResult<Polygon> {
  const strokeWidth = parseFloat(settings.strokeWidth);
  const zIndex = parseInt(settings.zIndex, 10);
  if (points.length < 3 || hasInvalidNumber(strokeWidth, zIndex)) {
    return { ok: false };
  }

  return {
    ok: true,
    object: new Polygon({
      contours: [points],
      color: { argb: settings.color },
      strokeWidth: strokeWidth,
      strokeColor: { argb: settings.strokeColor },
      zIndex: zIndex,
      userData: settings.userData ? { id: settings.userData } : null,
    }),
  };
}

function getPointCount(value: string, minValue: number): number | null {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < minValue ? null : parsed;
}

function hasInvalidNumber(...values: number[]): boolean {
  return values.some(Number.isNaN);
}
