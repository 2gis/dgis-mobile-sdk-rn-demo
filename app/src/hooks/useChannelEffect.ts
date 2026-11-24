import { useEffect, useRef } from 'react';
import type { Channel } from '@2gis/dgis-mobile-sdk-full';
import { readChannelStrict } from './readChannelStrict';

/**
 * Calls `handler` on each value of the channel from `getChannel`.
 * Resubscribes when `getChannel` returns another channel and disconnects on unmount.
 */
export function useChannelEffect<T>(
  getChannel: () => Channel<T> | null | undefined,
  handler: (value: T) => void,
): void {
  const channel = readChannelStrict(getChannel);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channel) {
      return;
    }
    const connection = channel.subscribe(value => handlerRef.current(value));
    return () => connection.disconnect();
  }, [channel]);
}
