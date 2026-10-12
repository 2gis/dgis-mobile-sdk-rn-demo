import type { ComponentType } from 'react';
import { AddObjectsDemo } from '../demos/AddObjectsDemo';
import { AllMapControlsDemo } from '../demos/AllMapControlsDemo';
import { BenchmarkDemo } from '../demos/benchmark/BenchmarkDemo';
import { CalcPositionDemo } from '../demos/CalcPositionDemo';
import { CameraMovesDemo } from '../demos/CameraMovesDemo';
import { ClusteringDemo } from '../demos/ClusteringDemo';
import { CopyrightDemo } from '../demos/CopyrightDemo';
import { CustomStyleLoadDemo } from '../demos/CustomStyleLoadDemo';
import { DownloadTerritoriesDemo } from '../demos/DownloadTerritoriesDemo';
import { FpsDemo } from '../demos/FpsDemo';
import { MapAppearanceDemo } from '../demos/MapAppearanceDemo';
import { MapGesturesDemo } from '../demos/MapGesturesDemo';
import { MapObjectsIdentificationDemo } from '../demos/MapObjectsIdentificationDemo';
import { MapSnapshotDemo } from '../demos/MapSnapshotDemo';
import { MapDemo } from '../demos/MapDemo';
import { NavigationViewDemo } from '../demos/NavigationViewDemo';
import { RecyclerViewDemo } from '../demos/RecyclerViewDemo';
import { SearchDemo } from '../demos/SearchDemo';
import { TextureViewDemo } from '../demos/TextureViewDemo';
import { TwoMapsDemo } from '../demos/TwoMapsDemo';
import { MapControlsDemo } from '../demos/MapControlsDemo';

export type TabCategory = 'navigation' | 'map' | 'directory';

export const TAB_CATEGORIES: TabCategory[] = ['navigation', 'map', 'directory'];

export interface Demo {
  // Route name, must be unique. Also shown as the screen header title.
  name: string;
  // One-line description shown in the catalog.
  subtitle: string;
  component: ComponentType;
  // Which tab this demo belongs to.
  category: TabCategory;
  // Lets map-based demos render beneath the side safe areas.
  edgeToEdge?: boolean;
}

// Adding a demo: create its component and append one entry here. The catalog and
// the navigator are driven by this list — nothing else needs to change.
export const demos: Demo[] = [
  {
    name: 'All map controls',
    subtitle: 'Traffic, zoom, compass, my-location, indoor controls',
    component: AllMapControlsDemo,
    category: 'map',
  },
  {
    name: 'Map',
    subtitle: '2GIS map rendering',
    component: MapDemo,
    category: 'map',
  },
  {
    name: 'Map appearance',
    subtitle: 'System, light, and dark map themes',
    component: MapAppearanceDemo,
    category: 'map',
  },
  {
    name: 'Camera moves',
    subtitle: 'Animated camera moves around Moscow',
    component: CameraMovesDemo,
    category: 'map',
  },
  {
    name: 'Add objects',
    subtitle: 'Circle, marker, polyline, polygon on the map',
    component: AddObjectsDemo,
    category: 'map',
  },
  {
    name: 'Benchmark',
    subtitle: 'FPS tracking on camera flight paths',
    component: BenchmarkDemo,
    category: 'map',
  },
  {
    name: 'Calc position',
    subtitle: 'calcPositionForObjects with padding, tilt, bearing',
    component: CalcPositionDemo,
    category: 'map',
  },
  {
    name: 'Clustering',
    subtitle: 'Clustering, generalization, and no grouping',
    component: ClusteringDemo,
    category: 'map',
  },
  {
    name: 'Copyright',
    subtitle: 'Map interactive and copyright state',
    component: CopyrightDemo,
    category: 'map',
  },
  {
    name: 'Custom style load',
    subtitle: 'Load custom_styles.2gis at map startup',
    component: CustomStyleLoadDemo,
    category: 'map',
  },
  {
    name: 'Download territories',
    subtitle: 'Filter by all/position/viewport and manage packages',
    component: DownloadTerritoriesDemo,
    category: 'map',
  },
  {
    name: 'Fps',
    subtitle: 'Realtime FPS monitor with animated camera controller',
    component: FpsDemo,
    category: 'map',
  },
  {
    name: 'Map gestures',
    subtitle: 'Disable gestures and handle tap/drag/long-touch events',
    component: MapGesturesDemo,
    category: 'map',
  },
  {
    name: 'Map objects identification',
    subtitle: 'Tap and long-touch identification (without route part)',
    component: MapObjectsIdentificationDemo,
    category: 'map',
  },
  {
    name: 'Map snapshot',
    subtitle: 'Take snapshot and show image preview',
    component: MapSnapshotDemo,
    category: 'map',
  },
  {
    name: 'Search',
    subtitle: 'Directory suggest and search',
    component: SearchDemo,
    category: 'directory',
  },
  {
    name: 'Two maps',
    subtitle: 'options vs incremental, side by side',
    component: TwoMapsDemo,
    category: 'map',
  },
  {
    name: 'Map controls',
    subtitle: 'Zoom, compass, traffic, indoor, my-location controls',
    component: MapControlsDemo,
    category: 'map',
  },
  {
    name: 'Texture view',
    subtitle: 'Bouncing map animation with TextureView rendering',
    component: TextureViewDemo,
    category: 'map',
  },
  {
    name: 'Recycler view',
    subtitle: 'Multiple maps in a scrollable list (TextureView)',
    component: RecyclerViewDemo,
    category: 'map',
  },
  {
    name: 'Navigation view',
    subtitle:
      'Long tap start/finish, simulate the drive, NavigationView on top',
    component: NavigationViewDemo,
    category: 'navigation',
    edgeToEdge: true,
  },
];
