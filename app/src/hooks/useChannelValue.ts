import { useEffect, useState } from 'react';
import type { Channel } from '@2gis/dgis-mobile-sdk-full';
import { readChannelStrict } from './readChannelStrict';

// Returns an SDK Channel's latest value as React state. Use it when the value is what
// you render; if you need to act on the value instead, use useChannelEffect.
export function useChannelValue<T>(
  getChannel: () => Channel<T> | null | undefined,
  initial: T,
): T {
  const channel = readChannelStrict(getChannel);
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (!channel) {
      return;
    }
    const connection = channel.subscribe(setValue);
    return () => connection.disconnect();
  }, [channel]);

  return value;
}
