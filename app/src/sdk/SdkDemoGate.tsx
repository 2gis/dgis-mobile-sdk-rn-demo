import React, { useEffect } from 'react';
import { Centered } from '../components/Centered';
import { useSdkController } from './SdkProvider';

export function SdkDemoGate({ children }: { children: React.ReactNode }) {
  const { context, contextError, ensureContext, isSettingsReady } =
    useSdkController();

  useEffect(() => {
    if (!isSettingsReady || context || contextError) {
      return;
    }
    ensureContext();
  }, [context, contextError, ensureContext, isSettingsReady]);

  if (!isSettingsReady) {
    return <Centered text="Loading SDK settings..." />;
  }
  if (contextError) {
    return <Centered text={`SDK init failed: ${contextError}`} />;
  }
  if (!context) {
    return <Centered text="Initializing SDK..." />;
  }
  return <>{children}</>;
}
