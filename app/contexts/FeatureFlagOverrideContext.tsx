import React, {
  createContext,
  useContext,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import {
  selectRemoteFeatureFlagsUnfiltered,
  selectLocalOverrides,
  selectRawFeatureFlags,
} from '../selectors/featureFlagController';
import { FeatureFlagInfo, getFeatureFlagType } from '../util/feature-flags';
import Engine from '../core/Engine';
import type { Json } from '@metamask/utils';

interface FeatureFlagOverrides {
  [key: string]: unknown;
}

export interface FeatureFlagOverrideContextType {
  featureFlags: { [key: string]: FeatureFlagInfo };
  originalFlags: FeatureFlagOverrides;
  featureFlagsList: FeatureFlagInfo[];
  overrides: FeatureFlagOverrides;
  setOverride: (key: string, value: unknown) => void;
  removeOverride: (key: string) => void;
  clearAllOverrides: () => void;
  hasOverride: (key: string) => boolean;
  getOverrideCount: () => number;
}

const FeatureFlagOverrideContext = createContext<
  FeatureFlagOverrideContextType | undefined
>(undefined);

interface FeatureFlagOverrideProviderProps {
  children: ReactNode;
}

export const FeatureFlagOverrideProvider: React.FC<
  FeatureFlagOverrideProviderProps
> = ({ children }) => {
  const featureFlagsWithOverrides = useSelector(
    selectRemoteFeatureFlagsUnfiltered,
  );
  const rawFeatureFlags = useSelector(selectRawFeatureFlags);

  const overrides = useSelector(selectLocalOverrides);

  const setOverride = useCallback((key: string, value: unknown) => {
    Engine.context?.RemoteFeatureFlagController?.setFlagOverride(
      key,
      value as Json,
    );
  }, []);

  const removeOverride = useCallback((key: string) => {
    Engine.context?.RemoteFeatureFlagController?.removeFlagOverride(key);
  }, []);

  const clearAllOverrides = useCallback(() => {
    Engine.context?.RemoteFeatureFlagController?.clearAllFlagOverrides();
  }, []);

  const hasOverride = useCallback(
    (key: string): boolean => key in overrides,
    [overrides],
  );

  const featureFlags = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(rawFeatureFlags || {}),
      ...Object.keys(featureFlagsWithOverrides || {}),
    ]);
    const allFlags: { [key: string]: FeatureFlagInfo } = {};

    Array.from(allKeys).forEach((key: string) => {
      const originalValue = rawFeatureFlags?.[key];
      const currentValue = featureFlagsWithOverrides?.[key];
      const isOverridden = hasOverride(key);

      const flagValue = {
        key,
        value: currentValue,
        originalValue,
        type: getFeatureFlagType(currentValue ?? originalValue),
        isOverridden,
      };
      allFlags[key] = flagValue;
    });
    return allFlags;
  }, [rawFeatureFlags, featureFlagsWithOverrides, hasOverride]);

  const featureFlagsList = useMemo(
    () =>
      Object.values(featureFlags).sort((a, b) => a.key.localeCompare(b.key)),
    [featureFlags],
  );

  const getOverrideCount = useCallback(
    (): number => Object.keys(overrides).length,
    [overrides],
  );

  const contextValue: FeatureFlagOverrideContextType = useMemo(
    () => ({
      featureFlags,
      originalFlags: rawFeatureFlags,
      featureFlagsList,
      overrides,
      setOverride,
      removeOverride,
      clearAllOverrides,
      hasOverride,
      getOverrideCount,
    }),
    [
      featureFlags,
      rawFeatureFlags,
      featureFlagsList,
      overrides,
      setOverride,
      removeOverride,
      clearAllOverrides,
      hasOverride,
      getOverrideCount,
    ],
  );

  return (
    <FeatureFlagOverrideContext.Provider value={contextValue}>
      {children}
    </FeatureFlagOverrideContext.Provider>
  );
};

export const useFeatureFlagOverride = (): FeatureFlagOverrideContextType => {
  const context = useContext(FeatureFlagOverrideContext);
  if (context === undefined) {
    throw new Error(
      'useFeatureFlagOverride must be used within a FeatureFlagOverrideProvider',
    );
  }
  return context;
};

export default FeatureFlagOverrideContext;
