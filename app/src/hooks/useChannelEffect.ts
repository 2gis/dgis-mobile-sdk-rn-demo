import { useEffect, useRef } from 'react';
import type { DependencyList } from 'react';
import type { Channel } from '@2gis/dgis-mobile-sdk-map';

// Runs a handler on each value from an SDK Channel — the side-effect counterpart of
// useChannelValue. Resubscribes on deps change, disconnects on unmount.
//
// getChannel is read inside the effect on purpose: SDK channel accessors (e.g.
// gestureRecognizer.tap) return a new object on every access, so keying on the
// reference would resubscribe every render. We key on the caller's deps instead.
export function useChannelEffect<T>(
  getChannel: () => Channel<T> | null | undefined,
  handler: (value: T) => void,
  deps: DependencyList,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const channel = getChannel();
    if (!channel) {
      return;
    }
    const connection = channel.subscribe(value => handlerRef.current(value));
    return () => connection.disconnect();
    // Keyed on deps, not getChannel/handler — see note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
