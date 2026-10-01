import { useCallback, useEffect, useRef } from 'react';
import type { Future } from '@2gis/dgis-mobile-sdk-map';
import { destroyIfPresent } from './nativeObjectLifecycle';

// Owns a single launched Future with "latest wins" semantics: a new run destroys the
// previous pending one, and unmount destroys the current one. For a stream of requests
// where only the latest result matters (object identification on every tap). If all
// results of the stream matter, use useFutures. Returns a stable run.
export function useLatestFuture() {
  const pendingRef = useRef<{ destroy(): void } | null>(null);

  useEffect(() => {
    return () => {
      destroyIfPresent(pendingRef.current);
      pendingRef.current = null;
    };
  }, []);

  return useCallback(
    <T>(
      future: Future<T>,
      onComplete: (value: T) => void,
      onError: (error: unknown) => void,
    ): void => {
      // Cancel the previous pending request — only the latest tap matters on screen.
      destroyIfPresent(pendingRef.current);
      pendingRef.current = future;
      future.onComplete(
        value => {
          // Stale result (request already superseded by a newer tap) is dropped.
          if (pendingRef.current !== future) {
            return;
          }
          pendingRef.current = null;
          onComplete(value);
        },
        error => {
          if (pendingRef.current !== future) {
            return;
          }
          pendingRef.current = null;
          onError(error);
        },
      );
    },
    [],
  );
}
