import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CameraPosition,
  DgisSource,
  DgisSourceWorkingMode,
  Fps,
  GeoPoint,
  MapController,
  MapControllerOptions,
  MapView,
  readyMapController,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  Context,
  Map as SdkMap,
  Source,
} from '@2gis/dgis-mobile-sdk-full';
import {
  useDefaultMapAppearance,
  useDefaultMapSettings,
} from '../hooks/useDefaultMapOptions';
import { useSdk } from '../sdk/useSdk';
import {
  createDgisSourceWorkingModeFromSettings,
  createGraphicsPresetFromSettings,
  createMapStyleFileFromSettings,
} from '../settings';
import { colors, spacing } from '../theme/theme';
import { destroyAll, destroyIfPresent } from './demoNativeCleanup';

/**
 * Two maps side by side, both started in the same tick, to compare first-frame
 * timing between "options" (all parameters at creation) and "incremental"
 * (empty creation, then configure on the live map). maxFps / powerSavingMaxFps
 * are construction-only and cannot be reproduced incrementally.
 */

const POSITION = new CameraPosition({
  point: new GeoPoint({
    latitude: { value: 55.760898 },
    longitude: { value: 37.620242 },
  }),
  zoom: { value: 15 },
});

const FONT_ICON_SIZE_MULTIPLIER = 1.5;
const MAX_FPS = new Fps({ value: 60 });
const POWER_SAVING_MAX_FPS = new Fps({ value: 30 });

function makeSources(
  context: Context,
  workingMode: DgisSourceWorkingMode,
): Source[] {
  return [
    DgisSource.createDgisSource(context, workingMode),
    DgisSource.createImmersiveDgisSource(context),
  ];
}

function withControllerMap<T>(
  controller: MapController,
  action: (map: SdkMap) => T,
): T {
  const map = controller.map;
  try {
    return action(map);
  } finally {
    destroyIfPresent(map);
  }
}

export function TwoMapsDemo() {
  const context = useSdk();
  const mapSettings = useDefaultMapSettings();
  const mapAppearance = useDefaultMapAppearance();
  const sourceWorkingMode =
    createDgisSourceWorkingModeFromSettings(mapSettings);
  const graphicsPreset = createGraphicsPresetFromSettings(mapSettings);
  const styleFile = useMemo(
    () => createMapStyleFileFromSettings(mapSettings),
    [mapSettings],
  );
  const [optionsController, setOptionsController] =
    useState<MapController | null>(null);
  const [incrementalController, setIncrementalController] =
    useState<MapController | null>(null);

  useEffect(() => {
    let cancelled = false;
    let optionsCtrl: MapController | null = null;
    let incrementalCtrl: MapController | null = null;
    const optionsSources = makeSources(context, sourceWorkingMode);
    const incrementalSources: Source[] = [];

    const optionsFuture = MapController.create(
      context,
      new MapControllerOptions({
        sources: optionsSources,
        position: POSITION,
        fontIconSizeMultiplier: FONT_ICON_SIZE_MULTIPLIER,
        graphicsPreset,
        mapAppearance,
        styleFile,
        maxFps: MAX_FPS,
        powerSavingMaxFps: POWER_SAVING_MAX_FPS,
      }),
    );
    optionsFuture.onComplete(
      created => {
        if (cancelled) {
          created.destroy();
          return;
        }
        withControllerMap(created, map => {
          map.appearance = mapAppearance;
          map.graphicsPreset = graphicsPreset;
        });
        optionsCtrl = created;
        setOptionsController(created);
      },
      () => {},
    );

    const incrementalFuture = MapController.create(
      context,
      new MapControllerOptions({ styleFile }),
    );
    incrementalFuture.onComplete(
      created => {
        if (cancelled) {
          created.destroy();
          return;
        }
        withControllerMap(created, map => {
          map.appearance = mapAppearance;
          map.graphicsPreset = graphicsPreset;
          for (const source of makeSources(context, sourceWorkingMode)) {
            incrementalSources.push(source);
            map.addSource(source);
          }
          const camera = map.camera;
          try {
            camera.position = POSITION;
          } finally {
            destroyIfPresent(camera);
          }
          map.fontIconSizeMultiplier = FONT_ICON_SIZE_MULTIPLIER;
        });
        // maxFps / powerSavingMaxFps: construction-only, no live setter.
        incrementalCtrl = created;
        setIncrementalController(created);
      },
      () => {},
    );

    return () => {
      cancelled = true;
      optionsFuture.destroy();
      incrementalFuture.destroy();
      optionsCtrl?.destroy();
      incrementalCtrl?.destroy();
      destroyAll(optionsSources);
      destroyAll(incrementalSources);
    };
  }, [context, graphicsPreset, mapAppearance, sourceWorkingMode, styleFile]);

  return (
    <View style={styles.container}>
      <View style={styles.half}>
        <Text style={styles.label}>options</Text>
        <View style={styles.mapWrap}>
          {optionsController && (
            <MapView
              controllerState={readyMapController(optionsController)}
              style={styles.map}
            />
          )}
        </View>
      </View>
      <View style={styles.half}>
        <Text style={styles.label}>incremental</Text>
        <View style={styles.mapWrap}>
          {incrementalController && (
            <MapView
              controllerState={readyMapController(incrementalController)}
              style={styles.map}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  half: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  label: {
    color: colors.textInverse,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
});
