import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import {
  ImageLoader,
  MapObjectManager,
  ModelLoader,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Context,
  Image as SdkImage,
  Map as SdkMap,
  MapController,
  ModelData as SdkModelData,
  ScreenPoint,
} from '@2gis/dgis-mobile-sdk-full';
import {
  type DemoImageCache,
  loadAirplaneModel,
  loadDemoMarkerImage,
} from '../../mapDemoAssets';
import {
  centerScreenPoint,
  mapScreenPoints,
  randomScreenPointsNear,
} from './geometry';
import {
  createCircleObject,
  createMarkerObject,
  createModelObject,
  createPolygonObject,
  createPolylineObject,
  getPolygonPointCount,
  getPolylinePointCount,
} from './factories';
import type {
  CircleSettings,
  LastObjectDraft,
  MarkerSettings,
  ModelSettings,
  PolygonSettings,
  PolylineSettings,
} from './types';

export interface AddMapObjectsActions {
  addCircle(settings: CircleSettings, screenPoint?: ScreenPoint): void;
  addMarker(settings: MarkerSettings, screenPoint?: ScreenPoint): Promise<void>;
  addModel(settings: ModelSettings, screenPoint?: ScreenPoint): Promise<void>;
  addPolyline(settings: PolylineSettings, screenPoints?: ScreenPoint[]): void;
  addPolygon(settings: PolygonSettings, screenPoints?: ScreenPoint[]): void;
  removeAll(): void;
  repeatLastObject(): void;
}

export function useAddMapObjects(
  context: Context,
  mapController: MapController | null,
): AddMapObjectsActions {
  const map = mapController?.map ?? null;
  const manager = useMemo(
    () => (map ? new MapObjectManager(map, null) : null),
    [map],
  );
  const imageLoader = useMemo(() => new ImageLoader(context), [context]);
  const modelLoader = useMemo(() => new ModelLoader(context), [context]);
  const lastObjectRef = useRef<LastObjectDraft | null>(null);
  const imageCacheRef = useRef<DemoImageCache>(new Map());
  const modelDataRef = useRef<SdkModelData | Promise<SdkModelData> | null>(
    null,
  );
  const lifecycleVersionRef = useRef(0);

  useEffect(() => {
    if (!manager) {
      return;
    }
    return () => {
      lifecycleVersionRef.current += 1;
      manager.removeAll();
      lastObjectRef.current = null;
    };
  }, [manager]);

  const resolveScreenPoint = useCallback(
    (sdkMap: SdkMap, screenPoint?: ScreenPoint) => {
      const resolvedScreenPoint = screenPoint ?? centerScreenPoint(sdkMap);
      const position =
        sdkMap.camera.projection.screenToMap(resolvedScreenPoint);
      return position ? { screenPoint: resolvedScreenPoint, position } : null;
    },
    [],
  );

  const addCircle = useCallback(
    (settings: CircleSettings, screenPoint?: ScreenPoint) => {
      if (!map || !manager) return;

      const resolved = resolveScreenPoint(map, screenPoint);
      if (!resolved) return;

      const result = createCircleObject(settings, resolved.position);
      if (!result.ok) return;

      manager.addObject(result.object);
      lastObjectRef.current = {
        kind: 'circle',
        settings: { ...settings },
        screenPoints: [resolved.screenPoint],
      };
    },
    [manager, map, resolveScreenPoint],
  );

  const addMarker = useCallback(
    async (settings: MarkerSettings, screenPoint?: ScreenPoint) => {
      if (!map || !manager) return;

      const resolved = resolveScreenPoint(map, screenPoint);
      if (!resolved) return;

      const requestVersion = lifecycleVersionRef.current;
      let icon: SdkImage;
      try {
        icon = await loadDemoMarkerImage(
          imageLoader,
          imageCacheRef.current,
          settings.markerType,
        );
      } catch (error) {
        Alert.alert('Failed to load marker image', String(error));
        return;
      }

      if (requestVersion !== lifecycleVersionRef.current) {
        return;
      }

      const result = createMarkerObject(settings, resolved.position, icon);
      if (!result.ok) return;

      manager.addObject(result.object);
      lastObjectRef.current = {
        kind: 'marker',
        settings: { ...settings },
        screenPoints: [resolved.screenPoint],
      };
    },
    [imageLoader, manager, map, resolveScreenPoint],
  );

  const addModel = useCallback(
    async (settings: ModelSettings, screenPoint?: ScreenPoint) => {
      if (!map || !manager) return;

      const resolved = resolveScreenPoint(map, screenPoint);
      if (!resolved) return;

      const requestVersion = lifecycleVersionRef.current;
      let data: SdkModelData;
      try {
        data = await loadAirplaneModel(modelLoader, modelDataRef);
      } catch (error) {
        Alert.alert('Failed to load model', String(error));
        return;
      }

      if (requestVersion !== lifecycleVersionRef.current) {
        return;
      }

      const result = createModelObject(settings, resolved.position, data);
      if (!result.ok) return;

      manager.addObject(result.object);
      lastObjectRef.current = {
        kind: 'model',
        settings: { ...settings },
        screenPoints: [resolved.screenPoint],
      };
    },
    [manager, map, modelLoader, resolveScreenPoint],
  );

  const addPolyline = useCallback(
    (settings: PolylineSettings, screenPoints?: ScreenPoint[]) => {
      if (!map || !manager) return;

      const pointCount = getPolylinePointCount(settings);
      if (pointCount === null) return;

      const resolvedScreenPoints =
        screenPoints ?? randomScreenPointsNear(map, pointCount);
      const points = mapScreenPoints(map, resolvedScreenPoints);
      const result = createPolylineObject(settings, points);
      if (!result.ok) return;

      manager.addObject(result.object);
      lastObjectRef.current = {
        kind: 'polyline',
        settings: { ...settings },
        screenPoints: resolvedScreenPoints,
      };
    },
    [manager, map],
  );

  const addPolygon = useCallback(
    (settings: PolygonSettings, screenPoints?: ScreenPoint[]) => {
      if (!map || !manager) return;

      const pointCount = getPolygonPointCount(settings);
      if (pointCount === null) return;

      const resolvedScreenPoints =
        screenPoints ?? randomScreenPointsNear(map, pointCount);
      const points = mapScreenPoints(map, resolvedScreenPoints);
      const result = createPolygonObject(settings, points);
      if (!result.ok) return;

      manager.addObject(result.object);
      lastObjectRef.current = {
        kind: 'polygon',
        settings: { ...settings },
        screenPoints: resolvedScreenPoints,
      };
    },
    [manager, map],
  );

  const removeAll = useCallback(() => {
    manager?.removeAll();
    lastObjectRef.current = null;
  }, [manager]);

  const repeatLastObject = useCallback(() => {
    const draft = lastObjectRef.current;
    if (!draft) {
      Alert.alert('Nothing to repeat', 'Create any object first.');
      return;
    }

    switch (draft.kind) {
      case 'circle':
        addCircle(draft.settings, draft.screenPoints[0]);
        break;
      case 'marker':
        void addMarker(draft.settings, draft.screenPoints[0]);
        break;
      case 'model':
        void addModel(draft.settings, draft.screenPoints[0]);
        break;
      case 'polyline':
        addPolyline(draft.settings, draft.screenPoints);
        break;
      case 'polygon':
        addPolygon(draft.settings, draft.screenPoints);
        break;
    }
  }, [addCircle, addMarker, addModel, addPolygon, addPolyline]);

  return {
    addCircle,
    addMarker,
    addModel,
    addPolyline,
    addPolygon,
    removeAll,
    repeatLastObject,
  };
}
