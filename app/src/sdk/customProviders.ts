import {
  Bearing,
  Duration,
  GeoPoint,
  Latitude,
  Location,
  LocationCoordinates,
  LocationCourse,
  Longitude,
  PlatformHeading,
} from '@2gis/dgis-mobile-sdk-map';
import type {
  DesiredAccuracy,
  HeadingAvailableNotifier,
  HeadingNotifier,
  HeadingProvider,
  LocationAvailableNotifier,
  LocationNotifier,
  LocationProvider,
} from '@2gis/dgis-mobile-sdk-map';

type Disposable<T> = T & {
  dispose(): void;
};

export type DisposableLocationProvider = Disposable<LocationProvider>;
export type DisposableHeadingProvider = Disposable<HeadingProvider>;

const customLocationRoute = [
  {
    latitude: 55.759909,
    longitude: 37.618806,
    accuracy: 15,
    course: 20,
  },
  {
    latitude: 55.746962,
    longitude: 37.643073,
    accuracy: 5,
    course: 10,
  },
] as const;

export function createCustomLocationProvider(): DisposableLocationProvider {
  const startedAtMs = Date.now();
  const createLocation = (index: 0 | 1) =>
    makeCustomLocation(
      customLocationRoute[index],
      Math.max(0, Date.now() - startedAtMs),
    );

  let lastLocation: Location | null = createLocation(0);
  let locationNotifier: LocationNotifier | null = null;
  let locationUpdateTimer: ReturnType<typeof setTimeout> | null = null;

  const clearLocationUpdateTimer = () => {
    if (locationUpdateTimer !== null) {
      clearTimeout(locationUpdateTimer);
      locationUpdateTimer = null;
    }
  };

  return {
    lastLocation: () => lastLocation,

    setNotifiers: (
      nextLocationNotifier: LocationNotifier | null,
      availableNotifier: LocationAvailableNotifier | null,
    ) => {
      clearLocationUpdateTimer();
      locationNotifier = nextLocationNotifier;

      if (!locationNotifier) {
        availableNotifier?.send(false);
        return;
      }

      availableNotifier?.send(true);
      lastLocation = createLocation(0);
      locationNotifier.send([lastLocation]);

      locationUpdateTimer = setTimeout(() => {
        lastLocation = createLocation(1);
        locationNotifier?.send([lastLocation]);
      }, 10_000);
    },

    setDesiredAccuracy: (_desiredAccuracy: DesiredAccuracy) => {},

    dispose: () => {
      clearLocationUpdateTimer();
      locationNotifier = null;
      lastLocation = null;
    },
  };
}

function makeCustomLocation(
  routePoint: (typeof customLocationRoute)[number],
  timestampMs: number,
): Location {
  return new Location({
    coordinates: new LocationCoordinates({
      value: new GeoPoint({
        latitude: new Latitude({ value: routePoint.latitude }),
        longitude: new Longitude({ value: routePoint.longitude }),
      }),
      accuracy: routePoint.accuracy,
    }),
    altitude: null,
    course: createLocationCourse(routePoint.course),
    groundSpeed: null,
    source: 'custom-location-provider',
    timestamp: Duration.ofMilliseconds(timestampMs),
  });
}

export function createCustomHeadingProvider(): DisposableHeadingProvider {
  let headingNotifier: HeadingNotifier | null = null;
  let headingRotationTimer: ReturnType<typeof setInterval> | null = null;
  let secondsFromStart = 0;

  const clearHeadingRotationTimer = () => {
    if (headingRotationTimer !== null) {
      clearInterval(headingRotationTimer);
      headingRotationTimer = null;
    }
  };

  const sendHeading = (degrees: number, seconds: number) => {
    headingNotifier?.send(
      new PlatformHeading({
        heading: createLocationCourse(degrees),
        timestamp: Duration.ofSeconds(seconds),
      }),
    );
  };

  return {
    setNotifiers: (
      nextHeadingNotifier: HeadingNotifier | null,
      availableNotifier: HeadingAvailableNotifier | null,
    ) => {
      clearHeadingRotationTimer();
      headingNotifier = nextHeadingNotifier;
      secondsFromStart = 0;

      if (!headingNotifier) {
        availableNotifier?.send(false);
        return;
      }

      availableNotifier?.send(true);
      sendHeading(0, secondsFromStart);

      headingRotationTimer = setInterval(() => {
        secondsFromStart += 1;
        sendHeading((secondsFromStart * 15) % 360, secondsFromStart);
      }, 1_000);
    },

    dispose: () => {
      clearHeadingRotationTimer();
      headingNotifier = null;
    },
  };
}

function createLocationCourse(degrees: number): LocationCourse {
  return new LocationCourse({
    value: new Bearing({ value: degrees }),
    accuracy: new Bearing({ value: 5 }),
  });
}
