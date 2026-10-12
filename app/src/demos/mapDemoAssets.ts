import type {
  Image as SdkImage,
  ImageLoader,
  ModelData,
  ModelLoader,
} from '@2gis/dgis-mobile-sdk-full';

export const scooterMarkerAsset = 'map/scooter_model.png';
export const bridgeMarkerAsset = 'map/bridge.svg';
export const batMarkerAsset = 'map/bat.json';
export const circleMarkerAsset = 'map/circle.png';
export const clusterMarkerAsset = 'map/icon_circle.png';
export const pinMarkerAsset = 'map/pin.png';
export const navigationStartMarkerAsset = 'map/navigation_start.svg';
export const navigationFinishMarkerAsset = 'map/navigation_finish.svg';
export const airplaneModelAsset = 'map/airplane.glb';

export type DemoMarkerType = 'scooterPng' | 'bridgeSvg' | 'batLottie';
export type NavigationPointMarkerType = 'start' | 'finish';

export const DEMO_MARKER_TYPE_OPTIONS: readonly {
  readonly value: DemoMarkerType;
  readonly label: string;
}[] = [
  { value: 'scooterPng', label: 'Scooter' },
  { value: 'bridgeSvg', label: 'Bridge' },
  { value: 'batLottie', label: 'Bat' },
];

export type DemoImageCache = Map<string, SdkImage | Promise<SdkImage>>;

async function readCachedImage(
  cache: DemoImageCache,
  key: string,
  create: () => Promise<SdkImage>,
): Promise<SdkImage> {
  const cached = cache.get(key);
  if (cached instanceof Promise) {
    return cached;
  }
  if (cached) {
    return cached;
  }

  const pending: Promise<SdkImage> = create()
    .then(image => {
      if (cache.get(key) === pending) {
        cache.set(key, image);
      }
      return image;
    })
    .catch(error => {
      if (cache.get(key) === pending) {
        cache.delete(key);
      }
      throw error;
    });

  cache.set(key, pending);
  return pending;
}

export async function loadDemoMarkerImage(
  loader: ImageLoader,
  cache: DemoImageCache,
  type: DemoMarkerType,
): Promise<SdkImage> {
  switch (type) {
    case 'scooterPng':
      return readCachedImage(cache, 'scooter:170x170', () =>
        loader.loadPngFromAsset(scooterMarkerAsset, 170, 170),
      );
    case 'bridgeSvg':
      return readCachedImage(cache, 'bridge:svg', () =>
        loader.loadSVGFromAsset(bridgeMarkerAsset),
      );
    case 'batLottie':
      return readCachedImage(cache, 'bat:lottie', () =>
        loader.loadLottieFromAsset(batMarkerAsset),
      );
  }
}

export async function loadCircleMarkerImage(
  loader: ImageLoader,
  cache: DemoImageCache,
): Promise<SdkImage> {
  return readCachedImage(cache, 'circle:160x160', () =>
    loader.loadPngFromAsset(circleMarkerAsset, 160, 160),
  );
}

export async function loadClusterMarkerImage(
  loader: ImageLoader,
  cache: DemoImageCache,
): Promise<SdkImage> {
  return readCachedImage(cache, 'cluster:64x64', () =>
    loader.loadPngFromAsset(clusterMarkerAsset, 64, 64),
  );
}

export async function loadPinMarkerImage(
  loader: ImageLoader,
  cache: DemoImageCache,
): Promise<SdkImage> {
  return readCachedImage(cache, 'pin:160x160', () =>
    loader.loadPngFromAsset(pinMarkerAsset, 160, 160),
  );
}

export async function loadNavigationPointMarkerImage(
  loader: ImageLoader,
  cache: DemoImageCache,
  type: NavigationPointMarkerType,
): Promise<SdkImage> {
  const asset =
    type === 'start' ? navigationStartMarkerAsset : navigationFinishMarkerAsset;
  return readCachedImage(cache, `navigation:${type}`, () =>
    loader.loadSVGFromAsset(asset),
  );
}

export async function loadAirplaneModel(
  loader: ModelLoader,
  cacheRef: { current: ModelData | Promise<ModelData> | null },
): Promise<ModelData> {
  const cached = cacheRef.current;
  if (cached instanceof Promise) {
    return cached;
  }
  if (cached) {
    return cached;
  }

  const pending: Promise<ModelData> = loader
    .loadFromAsset(airplaneModelAsset)
    .then(modelData => {
      if (cacheRef.current === pending) {
        cacheRef.current = modelData;
      }
      return modelData;
    })
    .catch(error => {
      if (cacheRef.current === pending) {
        cacheRef.current = null;
      }
      throw error;
    });

  cacheRef.current = pending;
  return pending;
}
