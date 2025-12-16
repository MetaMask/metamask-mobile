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
import type { RemoteFeatureFlagController } from '@metamask/remote-feature-flag-controller';

interface FeatureFlagOverrides {
  [key: string]: unknown;
}

// Extended interface for controller methods not in the base type definition
// These methods exist at runtime in the mobile app's version of RemoteFeatureFlagController
// but are not included in the @metamask/remote-feature-flag-controller type definitions
export interface ExtendedRemoteFeatureFlagController
  extends RemoteFeatureFlagController {
  setFlagOverride: (key: string, value: Json) => void;
  clearFlagOverride: (key: string) => void;
  getAllFlags: () => FeatureFlagOverrides;
  clearAllOverrides: () => void;
}

// Helper to safely access the RemoteFeatureFlagController with proper typing
const getRemoteFeatureFlagController = ():
  | ExtendedRemoteFeatureFlagController
  | undefined =>
  Engine.context?.RemoteFeatureFlagController as
    | ExtendedRemoteFeatureFlagController
    | undefined;

// Helper to safely execute controller methods with error handling
const withRemoteFeatureFlagController = (
  fn: (controller: ExtendedRemoteFeatureFlagController) => void,
  errorMessage: string,
): void => {
  const controller = getRemoteFeatureFlagController();
  if (!controller) {
    return;
  }
  try {
    fn(controller);
  } catch (error) {
    console.error(errorMessage, error);
  }
};

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

  // Subscribe to controller state changes to ensure we stay in sync
  useEffect(() => {
    const handler = () => {
      // State change will trigger Redux update via selector
      // No need to do anything here as Redux will handle the update
    };

    try {
      Engine.controllerMessenger?.subscribe(
        'RemoteFeatureFlagController:stateChange',
        handler,
      );
    } catch (error) {
      // Engine might not be fully initialized yet, ignore error
      console.warn(
        'Failed to subscribe to RemoteFeatureFlagController state changes:',
        error,
      );
    }

    return () => {
      // Note: Messenger subscribe doesn't return unsubscribe, but the subscription
      // will be cleaned up when the component unmounts
    };
  }, []);

  const setOverride = useCallback((key: string, value: unknown) => {
    withRemoteFeatureFlagController((controller) => {
      // Use the controller's setFlagOverride method which properly updates localOverrides in state
      controller.setFlagOverride(key, value as Json);
    }, 'Failed to set feature flag override:');
  }, []);

  const removeOverride = useCallback((key: string) => {
    withRemoteFeatureFlagController(
      (controller) => controller.clearFlagOverride(key),
      'Failed to remove feature flag override:',
    );
  }, []);

  const clearAllOverrides = useCallback(() => {
    withRemoteFeatureFlagController(
      (controller) => controller.clearAllOverrides(),
      'Failed to clear feature flag overrides:',
    );
  }, []);

  const hasOverride = useCallback(
    (key: string): boolean => key in overrides,
    [overrides],
  );

  const featureFlags = useMemo(() => {
    // Get all unique keys from both raw and overridden flags
    const allKeys = new Set([
      ...Object.keys(rawFeatureFlags),
      ...Object.keys(featureFlagsWithOverrides),
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
