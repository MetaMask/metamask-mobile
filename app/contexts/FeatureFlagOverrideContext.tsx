/* eslint-disable @typescript-eslint/no-explicit-any */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../selectors/featureFlagController';
import {
  FeatureFlagInfo,
  getFeatureFlagDescription,
  getFeatureFlagType,
} from '../util/feature-flags';

interface FeatureFlagOverrides {
  [key: string]: any;
}

interface FeatureFlagOverrideContextType {
  featureFlags: { [key: string]: FeatureFlagInfo };
  originalFlags: FeatureFlagOverrides;
  getFeatureFlag: (key: string) => FeatureFlagInfo;
  featureFlagsList: FeatureFlagInfo[];
  overrides: FeatureFlagOverrides;
  setOverride: (key: string, value: any) => void;
  removeOverride: (key: string) => void;
  clearAllOverrides: () => void;
  hasOverride: (key: string) => boolean;
  getOverride: (key: string) => any;
  getAllOverrides: () => FeatureFlagOverrides;
  applyOverrides: (originalFlags: FeatureFlagOverrides) => FeatureFlagOverrides;
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
  // Get the initial feature flags from Redux
  const rawFeatureFlags = useSelector(selectRemoteFeatureFlags);

  // Local state for overrides
  const [overrides, setOverrides] = useState<FeatureFlagOverrides>({});

  const setOverride = useCallback((key: string, value: any) => {
    setOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const removeOverride = useCallback((key: string) => {
    setOverrides((prev) => {
      const newOverrides = { ...prev };
      delete newOverrides[key];
      return newOverrides;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  const hasOverride = useCallback(
    (key: string): boolean => key in overrides,
    [overrides],
  );

  const getOverride = useCallback(
    (key: string): any => overrides[key],
    [overrides],
  );

  const getAllOverrides = useCallback((): FeatureFlagOverrides => ({ ...overrides }), [overrides]);

  const applyOverrides = useCallback(
    (originalFlags: FeatureFlagOverrides): FeatureFlagOverrides => ({
        ...originalFlags,
        ...overrides,
      }),
    [overrides],
  );

  const featureFlagsWithOverrides = useMemo(() => applyOverrides(rawFeatureFlags), [rawFeatureFlags, applyOverrides]);

  const featureFlags = useMemo(() => {
    // Get all unique keys from both raw and overridden flags
    const allKeys = new Set([
      ...Object.keys(rawFeatureFlags),
      ...Object.keys(featureFlagsWithOverrides),
      ...Object.keys(getAllOverrides()),
    ]);
    const allFlags: { [key: string]: FeatureFlagInfo } = {};

    // Process all feature flags and return flat list
    Array.from(allKeys).forEach((key: string) => {
      const originalValue = rawFeatureFlags[key];
      const currentValue = featureFlagsWithOverrides[key];
      const isOverridden = hasOverride(key);

      const flagValue = {
        key,
        value: currentValue,
        originalValue,
        type: getFeatureFlagType(currentValue ?? originalValue),
        description: getFeatureFlagDescription(key),
        isOverridden,
      };
      allFlags[key] = flagValue;
    });
    return allFlags;
  }, [
    rawFeatureFlags,
    featureFlagsWithOverrides,
    hasOverride,
    getAllOverrides,
  ]);

  const featureFlagsList = Object.values(featureFlags).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  /**
   * get a specific feature flag value with overrides applied
   */
  const getFeatureFlag = (key: string) => featureFlags[key];

  const getOverrideCount = useCallback((): number => Object.keys(overrides).length, [overrides]);

  const contextValue: FeatureFlagOverrideContextType = {
    featureFlags,
    originalFlags: rawFeatureFlags,
    getFeatureFlag,
    featureFlagsList,
    overrides,
    setOverride,
    removeOverride,
    clearAllOverrides,
    hasOverride,
    getOverride,
    getAllOverrides,
    applyOverrides,
    getOverrideCount,
  };

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
