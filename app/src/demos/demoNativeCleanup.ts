export {
  destroyIfPresent,
  ignoreNativeDestroyedError,
  isNativeDestroyedError,
  type Destroyable,
} from '../hooks/nativeObjectLifecycle';

import {
  destroyIfPresent,
  ignoreNativeDestroyedError,
  type Destroyable,
} from '../hooks/nativeObjectLifecycle';

export function destroyAll<T extends Destroyable>(items: Iterable<T>): void {
  for (const item of items) {
    ignoreNativeDestroyedError(() => destroyIfPresent(item));
  }
}

export function destroyResolvedCacheValues<T extends Destroyable>(
  cache: Map<string, T | Promise<T>>,
): void {
  for (const value of cache.values()) {
    if (!(value instanceof Promise)) {
      ignoreNativeDestroyedError(() => destroyIfPresent(value));
    }
  }
  cache.clear();
}

export function destroyCachedValue<T extends Destroyable>(
  cache: Map<string, T | Promise<T>>,
  value: T,
): void {
  for (const [key, cached] of cache.entries()) {
    if (cached === value) {
      cache.delete(key);
    }
  }

  ignoreNativeDestroyedError(() => destroyIfPresent(value));
}
