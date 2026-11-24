import { useCallback, useEffect, useRef } from 'react';
import type { Future } from '@2gis/dgis-mobile-sdk-full';

// Owns launched Futures, tying them to the component's lifetime. Returns a stable run:
// it starts a future, routes its result and error to the handlers, and tracks it until
// it settles. Futures still pending on unmount are cancelled, so onComplete does
// not fire on an unmounted component.
//
// This is for a STREAM of requests whose results all matter and may complete out of
// order. If only the latest matters (e.g. identification on every tap), use
// useLatestFuture instead: it cancels the previous pending request.
export function useFutures() {
  const pendingRef = useRef<Array<{ cancel(): void }>>([]);

  useEffect(() => {
    return () => {
      for (const future of pendingRef.current) {
        future.cancel();
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
      // Drop a settled future from pendingRef,
      // so that it is not retained for the whole lifetime of the component.
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
