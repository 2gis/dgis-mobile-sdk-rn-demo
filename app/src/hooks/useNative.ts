import { useEffect, useState } from 'react';
import type { DependencyList } from 'react';
import {
  destroyIfPresent,
  ignoreNativeDestroyedError,
} from './nativeObjectLifecycle';

// Ties a native SDK object's lifetime to the component: creates it via create() and
// calls destroy() on unmount and when deps change. Every SDK object extends
// NativeObject with destroy(), which frees native memory; calling it is optional but
// advisable — especially for large objects once they are no longer needed.
//
// create() is read INSIDE the effect and may return null ("not yet" — e.g. while
// there is no mapController); then no object is created. Returns the created object or
// null: the object appears after the mount effect, so it is null on the first render.
export function useNative<T extends { destroy(): void }>(
  create: () => T | null,
  deps: DependencyList,
): T | null {
  const [object, setObject] = useState<T | null>(null);

  useEffect(() => {
    const created = create();
    setObject(created);
    return () => {
      setTimeout(() => {
        ignoreNativeDestroyedError(() => {
          destroyIfPresent(created);
        });
      }, 0);
      setObject(null);
    };
    // create is read fresh inside the effect; we recreate only when deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return object;
}
