import { useCallback, useEffect, useRef } from 'react';
import type { Future } from '@2gis/dgis-mobile-sdk-full';
import { destroyIfPresent } from './nativeObjectLifecycle';

// Owns launched Futures, tying them to the component's lifetime. Returns a stable run:
// it starts a future, routes its result and error to the handlers, and tracks it until
// it settles; any still-pending futures are destroyed on unmount, so onComplete does
// not fire on an unmounted component.
//
// This is for a STREAM of requests whose results all matter and may complete out of
// order. If only the latest matters (e.g. identification on every tap), use
// useLatestFuture instead: it cancels the previous pending request.
export function useFutures() {
  // Keep only what cleanup needs — the destroy method; the future's value is unused.
  const pendingRef = useRef<Array<{ destroy(): void }>>([]);

  useEffect(() => {
    return () => {
      for (const future of pendingRef.current) {
        destroyIfPresent(future);
      }
      pendingRef.current = [];
    };
  }, []);

  return useCallback(
    <T>(
      future: Future<T>,
      onComplete: (value: T) => void,
      onError: (error: unknown) => void,
    ): void => {
      pendingRef.current.push(future);
      // Drop a settled future from the pending list so it is not retained (and
      // re-destroyed) for the whole component lifetime.
      const forget = () => {
        const index = pendingRef.current.indexOf(future);
        if (index !== -1) {
          pendingRef.current.splice(index, 1);
        }
      };
      future.onComplete(
        value => {
          forget();
          onComplete(value);
        },
        error => {
          forget();
          onError(error);
        },
      );
    },
    [],
  );
}
