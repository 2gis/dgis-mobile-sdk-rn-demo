import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MapView } from '@2gis/dgis-mobile-sdk-map';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { spacing } from '../theme/theme';
import {
  ActionButton,
  CircleDialog,
  MarkerDialog,
  ModelDialog,
  PolygonDialog,
  PolylineDialog,
} from './addObjects/AddObjectDialogs';
import { useAddMapObjects } from './addObjects/objects/useAddMapObjects';
import {
  DEFAULT_CIRCLE_SETTINGS,
  DEFAULT_MARKER_SETTINGS,
  DEFAULT_MODEL_SETTINGS,
  DEFAULT_POLYGON_SETTINGS,
  DEFAULT_POLYLINE_SETTINGS,
  type CircleSettings,
  type DialogKind,
  type MarkerSettings,
  type ModelSettings,
  type PolygonSettings,
  type PolylineSettings,
} from './addObjects/objects/types';

/**
 * Interactive demo for adding different map object types (circles, markers,
 * polylines, polygons) with customizable parameters.
 */
export function AddObjectsDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [circleSettings, setCircleSettings] = useState<CircleSettings>({
    ...DEFAULT_CIRCLE_SETTINGS,
  });
  const [markerSettings, setMarkerSettings] = useState<MarkerSettings>({
    ...DEFAULT_MARKER_SETTINGS,
  });
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    ...DEFAULT_MODEL_SETTINGS,
  });
  const [polylineSettings, setPolylineSettings] = useState<PolylineSettings>({
    ...DEFAULT_POLYLINE_SETTINGS,
  });
  const [polygonSettings, setPolygonSettings] = useState<PolygonSettings>({
    ...DEFAULT_POLYGON_SETTINGS,
  });
  const {
    addCircle,
    addMarker,
    addModel,
    addPolyline,
    addPolygon,
    removeAll,
    repeatLastObject,
  } = useAddMapObjects(context, mapController);

  return (
    <View style={styles.container}>
      <MapView controllerState={controllerState} style={styles.map} />
      <View style={styles.panel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ActionButton label="Circle" onPress={() => setDialog('circle')} />
          <ActionButton label="Marker" onPress={() => setDialog('marker')} />
          <ActionButton
            label="Polyline"
            onPress={() => setDialog('polyline')}
          />
          <ActionButton label="Polygon" onPress={() => setDialog('polygon')} />
          <ActionButton label="Repeat last" onPress={repeatLastObject} />
          <ActionButton label="Model" onPress={() => setDialog('model')} />
          <ActionButton label="Remove all" onPress={removeAll} destructive />
        </ScrollView>
      </View>

      {dialog === 'circle' && (
        <CircleDialog
          settings={circleSettings}
          onAdd={s => {
            setCircleSettings(s);
            setDialog(null);
            addCircle(s);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'marker' && (
        <MarkerDialog
          settings={markerSettings}
          onAdd={s => {
            setMarkerSettings(s);
            setDialog(null);
            void addMarker(s);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'model' && (
        <ModelDialog
          settings={modelSettings}
          onAdd={s => {
            setModelSettings(s);
            setDialog(null);
            void addModel(s);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'polyline' && (
        <PolylineDialog
          settings={polylineSettings}
          onAdd={s => {
            setPolylineSettings(s);
            setDialog(null);
            addPolyline(s);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'polygon' && (
        <PolygonDialog
          settings={polygonSettings}
          onAdd={s => {
            setPolygonSettings(s);
            setDialog(null);
            addPolygon(s);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
  },
});
