import type { Channel } from '@2gis/dgis-mobile-sdk-full';

/**
 * Reads the channel from `getChannel`. The getter must return the same channel object for the same source.
 * The JS object cache guarantees this for channels that the SDK returns by reference.
 * In development a getter that returns a new object on each call throws.
 */
export function readChannelStrict<T>(
  getChannel: () => Channel<T> | null | undefined,
): Channel<T> | null | undefined {
  const channel = getChannel();
  if (__DEV__ && channel != null && getChannel() !== channel) {
    throw new Error(
      'the channel getter returns a new channel object on every call; ' +
        'the JS object cache must be on and the SDK must return the channel by reference',
    );
  }
  return channel;
}
