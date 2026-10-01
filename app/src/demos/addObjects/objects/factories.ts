import {
  Circle,
  CircleOptions,
  Color,
  Elevation,
  GeoPointWithElevation,
  LogicalPixel,
  Marker,
  MarkerOptions,
  Meter,
  ModelMapObject,
  ModelMapObjectOptions,
  ModelScale,
  ModelSize,
  Polygon,
  PolygonOptions,
  Polyline,
  PolylineOptions,
  ZIndex,
} from '@2gis/dgis-mobile-sdk-map';
import type {
  GeoPoint,
  Image as SdkImage,
  ModelData as SdkModelData,
} from '@2gis/dgis-mobile-sdk-map';
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
    object: new Circle(
      new CircleOptions({
        position,
        radius: new Meter({ value: radius }),
        color: new Color({ argb: settings.color }),
        strokeWidth: new LogicalPixel({ value: strokeWidth }),
        strokeColor: new Color({ argb: settings.strokeColor }),
        zIndex: new ZIndex({ value: zIndex }),
        userData: settings.userData ? { id: settings.userData } : null,
      }),
    ),
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
    object: new Marker(
      new MarkerOptions({
        position: new GeoPointWithElevation({
          latitude: position.latitude,
          longitude: position.longitude,
          elevation: new Elevation({ value: elevation }),
        }),
        icon,
        text: settings.text || null,
        iconWidth: new LogicalPixel({ value: iconWidth }),
        zIndex: new ZIndex({ value: zIndex }),
        userData: settings.userData ? { id: settings.userData } : null,
      }),
    ),
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
    object: new ModelMapObject(
      new ModelMapObjectOptions({
        position: new GeoPointWithElevation({
          latitude: position.latitude,
          longitude: position.longitude,
        }),
        data,
        size: settings.scaleEnabled
          ? ModelSize.scale(new ModelScale({ value: size }))
          : ModelSize.logicalPixel(new LogicalPixel({ value: size })),
        userData: settings.userData ? { value: settings.userData } : null,
      }),
    ),
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
    object: new Polyline(
      new PolylineOptions({
        points,
        width: new LogicalPixel({ value: width }),
        color: new Color({ argb: settings.color }),
        zIndex: new ZIndex({ value: zIndex }),
        userData: settings.userData ? { id: settings.userData } : null,
      }),
    ),
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
    object: new Polygon(
      new PolygonOptions({
        contours: [points],
        color: new Color({ argb: settings.color }),
        strokeWidth: new LogicalPixel({ value: strokeWidth }),
        strokeColor: new Color({ argb: settings.strokeColor }),
        zIndex: new ZIndex({ value: zIndex }),
        userData: settings.userData ? { id: settings.userData } : null,
      }),
    ),
  };
}

function getPointCount(value: string, minValue: number): number | null {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < minValue ? null : parsed;
}

function hasInvalidNumber(...values: number[]): boolean {
  return values.some(Number.isNaN);
}
