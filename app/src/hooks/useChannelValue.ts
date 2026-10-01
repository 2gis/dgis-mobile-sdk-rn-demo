import { useEffect, useState } from 'react';
import type { DependencyList } from 'react';
import type { Channel } from '@2gis/dgis-mobile-sdk-map';

// Returns an SDK Channel's latest value as React state. Use it when the value is what
// you render; if you need to act on the value instead, use useChannelEffect.
//
// getChannel is read inside the effect: SDK channel accessors return a new object on
// every access, so keying on the reference would resubscribe every render. We key on
// the caller's deps instead.
export function useChannelValue<T>(
  getChannel: () => Channel<T> | null | undefined,
  initial: T,
  deps: DependencyList,
): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const channel = getChannel();
    if (!channel) {
      return;
    }
    const connection = channel.subscribe(setValue);
    return () => connection.disconnect();
    // Keyed on deps, not getChannel — see note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
