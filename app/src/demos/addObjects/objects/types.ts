import type { ScreenPoint } from '@2gis/dgis-mobile-sdk-full';
import type { DemoMarkerType } from '../../mapDemoAssets';

export type DialogKind =
  | 'circle'
  | 'marker'
  | 'model'
  | 'polyline'
  | 'polygon'
  | null;

export interface ColorPreset {
  label: string;
  argb: number;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { label: 'Black', argb: 0xff000000 },
  { label: 'Red', argb: 0xffff0000 },
  { label: 'Blue', argb: 0xff2196f3 },
  { label: 'Green', argb: 0xff4caf50 },
  { label: 'Yellow', argb: 0xffffff00 },
  { label: 'Purple', argb: 0xff9c27b0 },
];

export interface CircleSettings {
  radius: string;
  color: number;
  strokeWidth: string;
  strokeColor: number;
  zIndex: string;
  userData: string;
}

export interface MarkerSettings {
  text: string;
  elevation: string;
  iconWidth: string;
  zIndex: string;
  userData: string;
  markerType: DemoMarkerType;
}

export interface ModelSettings {
  userData: string;
  size: string;
  scaleEnabled: boolean;
}

export interface PolylineSettings {
  pointCount: string;
  width: string;
  color: number;
  zIndex: string;
  userData: string;
}

export interface PolygonSettings {
  pointCount: string;
  color: number;
  strokeWidth: string;
  strokeColor: number;
  zIndex: string;
  userData: string;
}

export const DEFAULT_CIRCLE_SETTINGS: CircleSettings = {
  radius: '100',
  color: 0xffff0000,
  strokeWidth: '2',
  strokeColor: 0xff000000,
  zIndex: '1',
  userData: '',
};

export const DEFAULT_MARKER_SETTINGS: MarkerSettings = {
  text: 'Marker',
  elevation: '0',
  iconWidth: '45',
  zIndex: '1',
  userData: '',
  markerType: 'scooterPng',
};

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  userData: '',
  size: '50',
  scaleEnabled: false,
};

export const DEFAULT_POLYLINE_SETTINGS: PolylineSettings = {
  pointCount: '3',
  width: '5',
  color: 0xff2196f3,
  zIndex: '1',
  userData: '',
};

export const DEFAULT_POLYGON_SETTINGS: PolygonSettings = {
  pointCount: '4',
  color: 0xffffff00,
  strokeWidth: '3',
  strokeColor: 0xff9c27b0,
  zIndex: '1',
  userData: '',
};

export type LastObjectDraft =
  | {
      kind: 'circle';
      settings: CircleSettings;
      screenPoints: ScreenPoint[];
    }
  | {
      kind: 'marker';
      settings: MarkerSettings;
      screenPoints: ScreenPoint[];
    }
  | {
      kind: 'model';
      settings: ModelSettings;
      screenPoints: ScreenPoint[];
    }
  | {
      kind: 'polyline';
      settings: PolylineSettings;
      screenPoints: ScreenPoint[];
    }
  | {
      kind: 'polygon';
      settings: PolygonSettings;
      screenPoints: ScreenPoint[];
    };
