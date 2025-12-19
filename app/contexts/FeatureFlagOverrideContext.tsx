import React, {
  createContext,
  useContext,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import {
  selectRemoteFeatureFlags,
  selectLocalOverrides,
  selectRawFeatureFlags,
} from '../selectors/featureFlagController';
import {
  FeatureFlagInfo,
  getFeatureFlagType,
  isMinimumRequiredVersionSupported,
} from '../util/feature-flags';
import {
  ToastContext,
  ToastVariants,
} from '../component-library/components/Toast';
import { MinimumVersionFlagValue } from '../components/Views/FeatureFlagOverride/FeatureFlagOverride';
import useMetrics from '../components/hooks/useMetrics/useMetrics';
import Engine from '../core/Engine';
import type { Json } from '@metamask/utils';

interface FeatureFlagOverrides {
  [key: string]: unknown;
}

export interface FeatureFlagOverrideContextType {
  featureFlags: { [key: string]: FeatureFlagInfo };
  originalFlags: FeatureFlagOverrides;
  getFeatureFlag: (key: string) => unknown;
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
  const { addTraitsToUser } = useMetrics();
  // Get the initial feature flags from Redux
  const featureFlagsWithOverrides = useSelector(selectRemoteFeatureFlags);
  const rawFeatureFlags = useSelector(selectRawFeatureFlags);

  // Get overrides from controller state via Redux
  const overrides = useSelector(selectLocalOverrides);
  const toastContext = useContext(ToastContext);
  const toastRef = toastContext?.toastRef;

  // Track remote feature flags and add all flags to user traits in bulk
  useEffect(() => {
    if (rawFeatureFlags && Object.keys(rawFeatureFlags).length > 0) {
      addTraitsToUser(rawFeatureFlags);
    }
  }, [rawFeatureFlags, addTraitsToUser]);

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
    // Get all unique keys from both raw and overridden flags
    const allKeys = new Set([
      ...Object.keys(rawFeatureFlags || {}),
      ...Object.keys(featureFlagsWithOverrides || {}),
    ]);
    const allFlags: { [key: string]: FeatureFlagInfo } = {};

    // Process all feature flags and return flat list
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

  const validateMinimumVersion = useCallback(
    (flagKey: string, flagValue: MinimumVersionFlagValue) => {
      if (
        process.env.METAMASK_ENVIRONMENT !== 'production' &&
        !isMinimumRequiredVersionSupported(flagValue.minimumVersion)
      ) {
        toastRef?.current?.showToast({
          labelOptions: [
            {
              label: 'Unsupported version',
              isBold: true,
            },
            {
              label: `${flagKey} is not supported on your version of the app.`,
            },
          ],
          hasNoTimeout: false,
          variant: ToastVariants.Plain,
        });
        return false;
      }
      return flagValue.enabled;
    },
    [toastRef],
  );

  /**
   * get a specific feature flag value with overrides applied
   */
  const getFeatureFlag = useCallback(
    (key: string) => {
      const flag = featureFlags[key];
      if (!flag) {
        return undefined;
      }

      if (flag.type === 'boolean with minimumVersion') {
        const flagValue = validateMinimumVersion(
          flag.key,
          flag.value as unknown as MinimumVersionFlagValue,
        );
        addTraitsToUser({
          [flag.key]: flagValue,
        });
        return flagValue;
      }
      if (flag.type === 'boolean') {
        addTraitsToUser({
          [flag.key]: flag.value as boolean,
        });
      }

      return flag.value;
    },
    [featureFlags, validateMinimumVersion, addTraitsToUser],
  );

  const getOverrideCount = useCallback(
    (): number => Object.keys(overrides).length,
    [overrides],
  );

  const contextValue: FeatureFlagOverrideContextType = useMemo(
    () => ({
      featureFlags,
      originalFlags: rawFeatureFlags,
      getFeatureFlag,
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
      getFeatureFlag,
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
