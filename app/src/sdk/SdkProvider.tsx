import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DGis } from '@2gis/dgis-mobile-sdk-full';
import type { Context } from '@2gis/dgis-mobile-sdk-full';
import {
  createHttpOptionsFromSettings,
  createLogOptionsFromSettings,
  defaultSdkSettings,
  normalizeSdkSettings,
  readStoredSdkSettings,
  sdkSettingsStorageKey,
  serializeSdkSettings,
  type SdkSettings,
} from '../settings';
import {
  createCustomHeadingProvider,
  createCustomLocationProvider,
  type DisposableHeadingProvider,
  type DisposableLocationProvider,
} from './customProviders';

export const SdkContext = createContext<Context | null>(null);

interface SdkControllerValue {
  context: Context | null;
  contextError: string | null;
  ensureContext: () => void;
  isSettingsReady: boolean;
  saveSettings: (next: SdkSettings) => Promise<void>;
  settings: SdkSettings;
}

const SdkControllerContext = createContext<SdkControllerValue | null>(null);

// Loads persisted SDK settings on startup and creates the SDK Context only when
// a demo screen explicitly asks for it.
export function SdkProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<Context | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [isSettingsReady, setIsSettingsReady] = useState(false);
  const [settings, setSettings] = useState(defaultSdkSettings);
  const contextRef = useRef<Context | null>(null);
  const isCreatingRef = useRef(false);
  const locationProviderRef = useRef<DisposableLocationProvider | null>(null);
  const headingProviderRef = useRef<DisposableHeadingProvider | null>(null);

  const disposeCustomProviders = useCallback(() => {
    locationProviderRef.current?.dispose();
    locationProviderRef.current = null;
    headingProviderRef.current?.dispose();
    headingProviderRef.current = null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(sdkSettingsStorageKey)
      .then(raw => {
        if (!isMounted) {
          return;
        }
        setSettings(readStoredSdkSettings(raw));
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setSettings(defaultSdkSettings);
      })
      .finally(() => {
        if (isMounted) {
          setIsSettingsReady(true);
        }
      });

    return () => {
      isMounted = false;
      if (contextRef.current) {
        DGis.releaseContext(contextRef.current);
        contextRef.current = null;
      }
      disposeCustomProviders();
    };
  }, [disposeCustomProviders]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const ensureContext = useCallback(() => {
    if (!isSettingsReady || context || contextError || isCreatingRef.current) {
      return;
    }

    isCreatingRef.current = true;
    disposeCustomProviders();

    const locationProvider = settings.location.useCustomLocationProvider
      ? createCustomLocationProvider()
      : null;
    const headingProvider = settings.location.useCustomHeadingProvider
      ? createCustomHeadingProvider()
      : null;

    locationProviderRef.current = locationProvider;
    headingProviderRef.current = headingProvider;

    try {
      const created = DGis.createContext(
        createHttpOptionsFromSettings(settings.http),
        createLogOptionsFromSettings(settings.log),
        undefined,
        undefined,
        undefined,
        locationProvider,
        headingProvider,
      );
      setContext(created);
      setContextError(null);
    } catch (e) {
      setContextError(e instanceof Error ? e.message : String(e));
      disposeCustomProviders();
    } finally {
      isCreatingRef.current = false;
    }
  }, [
    context,
    contextError,
    disposeCustomProviders,
    isSettingsReady,
    settings,
  ]);

  const saveSettings = useCallback(
    async (next: SdkSettings) => {
      const normalized = normalizeSdkSettings(next);
      await AsyncStorage.setItem(
        sdkSettingsStorageKey,
        serializeSdkSettings(normalized),
      );
      setSettings(normalized);
      if (!context) {
        setContextError(null);
      }
    },
    [context],
  );

  const controllerValue = useMemo(
    () => ({
      context,
      contextError,
      ensureContext,
      isSettingsReady,
      saveSettings,
      settings,
    }),
    [
      context,
      contextError,
      ensureContext,
      isSettingsReady,
      saveSettings,
      settings,
    ],
  );

  return (
    <SdkControllerContext.Provider value={controllerValue}>
      <SdkContext.Provider value={context}>{children}</SdkContext.Provider>
    </SdkControllerContext.Provider>
  );
}

export function useSdkController(): SdkControllerValue {
  const controller = React.useContext(SdkControllerContext);
  if (!controller) {
    throw new Error('useSdkController must be used inside <SdkProvider>');
  }
  return controller;
}
