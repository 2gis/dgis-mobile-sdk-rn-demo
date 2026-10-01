import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
  ImageLoader,
  MapObjectManager,
  ModelLoader,
} from '@2gis/dgis-mobile-sdk-map';
import type {
  Context,
  Image as SdkImage,
  Map as SdkMap,
  MapController,
  ModelData as SdkModelData,
  ScreenPoint,
  SimpleMapObject,
} from '@2gis/dgis-mobile-sdk-map';
import {
  type DemoImageCache,
  loadAirplaneModel,
  loadDemoMarkerImage,
} from '../../mapDemoAssets';
import {
  destroyAll,
  destroyCachedValue,
  destroyIfPresent,
  destroyResolvedCacheValues,
  ignoreNativeDestroyedError,
} from '../../demoNativeCleanup';
import {
  centerScreenPoint,
  mapScreenPoints,
  randomScreenPointsNear,
  withProjection,
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
  const imageLoaderRef = useRef<ImageLoader | null>(null);
  const modelLoaderRef = useRef<ModelLoader | null>(null);
  const mapRef = useRef<SdkMap | null>(null);
  const managerRef = useRef<MapObjectManager | null>(null);
  const objectsRef = useRef<SimpleMapObject[]>([]);
  const lastObjectRef = useRef<LastObjectDraft | null>(null);
  const imageCacheRef = useRef<DemoImageCache>(new Map());
  const modelDataRef = useRef<SdkModelData | Promise<SdkModelData> | null>(
    null,
  );
  const lifecycleVersionRef = useRef(0);

  if (imageLoaderRef.current === null) {
    imageLoaderRef.current = new ImageLoader(context);
  }
  if (modelLoaderRef.current === null) {
    modelLoaderRef.current = new ModelLoader(context);
  }

  useEffect(() => {
    if (!mapController) {
      return;
    }

    const map = mapController.map;
    const manager = new MapObjectManager(map, null);
    mapRef.current = map;
    managerRef.current = manager;

    const imageCache = imageCacheRef.current;

    return () => {
      lifecycleVersionRef.current += 1;
      ignoreNativeDestroyedError(() => manager.removeAll());
      ignoreNativeDestroyedError(() => destroyAll(objectsRef.current));
      objectsRef.current = [];
      ignoreNativeDestroyedError(() => destroyIfPresent(manager));
      managerRef.current = null;
      ignoreNativeDestroyedError(() => destroyIfPresent(map));
      mapRef.current = null;
      lastObjectRef.current = null;
      ignoreNativeDestroyedError(() => destroyResolvedCacheValues(imageCache));
      const modelData = modelDataRef.current;
      if (modelData !== null && !(modelData instanceof Promise)) {
        ignoreNativeDestroyedError(() => destroyIfPresent(modelData));
      }
      modelDataRef.current = null;
    };
  }, [mapController]);

  const getMap = useCallback((): SdkMap | null => mapRef.current, []);

  const resolveScreenPoint = useCallback(
    (map: SdkMap, screenPoint?: ScreenPoint) => {
      const resolvedScreenPoint = screenPoint ?? centerScreenPoint(map);
      const position = withProjection(map, projection =>
        projection.screenToMap(resolvedScreenPoint),
      );
      return position ? { screenPoint: resolvedScreenPoint, position } : null;
    },
    [],
  );

  const addObject = useCallback((object: SimpleMapObject): void => {
    managerRef.current?.addObject(object);
    objectsRef.current.push(object);
  }, []);

  const addCircle = useCallback(
    (settings: CircleSettings, screenPoint?: ScreenPoint) => {
      const map = getMap();
      if (!map || !managerRef.current) return;

      const resolved = resolveScreenPoint(map, screenPoint);
      if (!resolved) return;

      const result = createCircleObject(settings, resolved.position);
      if (!result.ok) return;

      addObject(result.object);
      lastObjectRef.current = {
        kind: 'circle',
        settings: { ...settings },
        screenPoints: [resolved.screenPoint],
      };
    },
    [addObject, getMap, resolveScreenPoint],
  );

  const addMarker = useCallback(
    async (settings: MarkerSettings, screenPoint?: ScreenPoint) => {
      const map = getMap();
      if (!map || !managerRef.current) return;

      const resolved = resolveScreenPoint(map, screenPoint);
      if (!resolved) return;

      const requestVersion = lifecycleVersionRef.current;
      let icon: SdkImage;
      try {
        icon = await loadDemoMarkerImage(
          imageLoaderRef.current!,
          imageCacheRef.current,
          settings.markerType,
        );
      } catch (error) {
        Alert.alert('Failed to load marker image', String(error));
        return;
      }

      if (
        requestVersion !== lifecycleVersionRef.current ||
        !managerRef.current
      ) {
        destroyCachedValue(imageCacheRef.current, icon);
        return;
      }

      const result = createMarkerObject(settings, resolved.position, icon);
      if (!result.ok) return;

      addObject(result.object);
      lastObjectRef.current = {
        kind: 'marker',
        settings: { ...settings },
        screenPoints: [resolved.screenPoint],
      };
    },
    [addObject, getMap, resolveScreenPoint],
  );

  const addModel = useCallback(
    async (settings: ModelSettings, screenPoint?: ScreenPoint) => {
      const map = getMap();
      if (!map || !managerRef.current) return;

      const resolved = resolveScreenPoint(map, screenPoint);
      if (!resolved) return;

      const requestVersion = lifecycleVersionRef.current;
      let data: SdkModelData;
      try {
        data = await loadAirplaneModel(modelLoaderRef.current!, modelDataRef);
      } catch (error) {
        Alert.alert('Failed to load model', String(error));
        return;
      }

      if (
        requestVersion !== lifecycleVersionRef.current ||
        !managerRef.current
      ) {
        if (modelDataRef.current === data) {
          modelDataRef.current = null;
        }
        ignoreNativeDestroyedError(() => destroyIfPresent(data));
        return;
      }

      const result = createModelObject(settings, resolved.position, data);
      if (!result.ok) return;

      addObject(result.object);
      lastObjectRef.current = {
        kind: 'model',
        settings: { ...settings },
        screenPoints: [resolved.screenPoint],
      };
    },
    [addObject, getMap, resolveScreenPoint],
  );

  const addPolyline = useCallback(
    (settings: PolylineSettings, screenPoints?: ScreenPoint[]) => {
      const map = getMap();
      if (!map || !managerRef.current) return;

      const pointCount = getPolylinePointCount(settings);
      if (pointCount === null) return;

      const resolvedScreenPoints =
        screenPoints ?? randomScreenPointsNear(map, pointCount);
      const points = mapScreenPoints(map, resolvedScreenPoints);
      const result = createPolylineObject(settings, points);
      if (!result.ok) return;

      addObject(result.object);
      lastObjectRef.current = {
        kind: 'polyline',
        settings: { ...settings },
        screenPoints: resolvedScreenPoints,
      };
    },
    [addObject, getMap],
  );

  const addPolygon = useCallback(
    (settings: PolygonSettings, screenPoints?: ScreenPoint[]) => {
      const map = getMap();
      if (!map || !managerRef.current) return;

      const pointCount = getPolygonPointCount(settings);
      if (pointCount === null) return;

      const resolvedScreenPoints =
        screenPoints ?? randomScreenPointsNear(map, pointCount);
      const points = mapScreenPoints(map, resolvedScreenPoints);
      const result = createPolygonObject(settings, points);
      if (!result.ok) return;

      addObject(result.object);
      lastObjectRef.current = {
        kind: 'polygon',
        settings: { ...settings },
        screenPoints: resolvedScreenPoints,
      };
    },
    [addObject, getMap],
  );

  const removeAll = useCallback(() => {
    ignoreNativeDestroyedError(() => managerRef.current?.removeAll());
    ignoreNativeDestroyedError(() => destroyAll(objectsRef.current));
    objectsRef.current = [];
    lastObjectRef.current = null;
  }, []);

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
