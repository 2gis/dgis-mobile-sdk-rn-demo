import { useContext } from 'react';
import type { Context } from '@2gis/dgis-mobile-sdk-full';
import { SdkContext } from './SdkProvider';

// Returns the SDK Context provided by SdkProvider. Throws if used outside it.
export function useSdk(): Context {
  const context = useContext(SdkContext);
  if (!context) {
    throw new Error('useSdk must be used inside <SdkProvider>');
  }
  return context;
}
