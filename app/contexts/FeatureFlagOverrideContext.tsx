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
} from '../selectors/featureFlagController';
import {
  FeatureFlagInfo,
  getFeatureFlagDescription,
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
interface ExtendedRemoteFeatureFlagController
  extends RemoteFeatureFlagController {
  setFlagOverride: (key: string, value: Json) => void;
  clearFlagOverride: (key: string) => void;
  getAllFlags: () => FeatureFlagOverrides;
  clearAllOverrides: () => void;
}

// Helper to check if Engine is ready
const isEngineReady = (): boolean => {
  try {
    return !!(
      Engine.context &&
      Engine.context.RemoteFeatureFlagController &&
      Engine.controllerMessenger
    );
  } catch {
    return false;
  }
};

// Helper to safely access the RemoteFeatureFlagController with proper typing
const getRemoteFeatureFlagController = ():
  | ExtendedRemoteFeatureFlagController
  | undefined => {
  if (!isEngineReady()) {
    return undefined;
  }
  return Engine.context?.RemoteFeatureFlagController as
    | ExtendedRemoteFeatureFlagController
    | undefined;
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
  getOverride: (key: string) => unknown;
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
  const { addTraitsToUser } = useMetrics();
  // Get the initial feature flags from Redux
  const rawFeatureFlagsSelected = useSelector(selectRemoteFeatureFlags);
  const rawFeatureFlags = useMemo(
    () => rawFeatureFlagsSelected || {},
    [rawFeatureFlagsSelected],
  );
  // Get overrides from controller state via Redux
  const localOverridesSelected = useSelector(selectLocalOverrides);
  const overrides = useMemo(
    () => localOverridesSelected || {},
    [localOverridesSelected],
  );
  const toastContext = useContext(ToastContext);
  const toastRef = toastContext?.toastRef;

  // Subscribe to controller state changes to ensure we stay in sync
  useEffect(() => {
    if (!isEngineReady()) {
      return;
    }

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
    if (!isEngineReady()) {
      console.warn('Engine not ready, cannot set feature flag override');
      return;
    }
    try {
      const controller = getRemoteFeatureFlagController();
      if (!controller) {
        return;
      }
      // Use the controller's setFlagOverride method which properly updates localOverrides in state
      controller.setFlagOverride(key, value as Json);
    } catch (error) {
      console.error('Failed to set feature flag override:', error);
    }
  }, []);

  const removeOverride = useCallback((key: string) => {
    if (!isEngineReady()) {
      console.warn('Engine not ready, cannot remove feature flag override');
      return;
    }
    try {
      const controller = getRemoteFeatureFlagController();
      if (!controller) {
        return;
      }
      controller.clearFlagOverride(key);
    } catch (error) {
      console.error('Failed to remove feature flag override:', error);
    }
  }, []);

  const clearAllOverrides = useCallback(() => {
    if (!isEngineReady()) {
      console.warn('Engine not ready, cannot clear feature flag overrides');
      return;
    }
    try {
      const controller = getRemoteFeatureFlagController();
      if (!controller) {
        return;
      }
      controller.clearAllOverrides();
    } catch (error) {
      console.error('Failed to clear feature flag overrides:', error);
    }
  }, []);

  const hasOverride = useCallback(
    (key: string): boolean => key in overrides,
    [overrides],
  );

  const getOverride = useCallback(
    (key: string): unknown => overrides[key],
    [overrides],
  );

  const getAllOverrides = useCallback(
    (): FeatureFlagOverrides => ({ ...overrides }),
    [overrides],
  );

  const applyOverrides = useCallback(
    (originalFlags: FeatureFlagOverrides): FeatureFlagOverrides => {
      // Use controller's getAllFlags method which already applies overrides
      const controller = getRemoteFeatureFlagController();
      if (!controller) {
        return {
          ...originalFlags,
          ...overrides,
        };
      }
      return controller.getAllFlags() as FeatureFlagOverrides;
    },
    [overrides],
  );

  // Use controller's getAllFlags method which already applies overrides
  // This method combines remoteFeatureFlags with localOverrides, giving precedence to localOverrides
  const featureFlagsWithOverrides = useMemo(() => {
    if (!isEngineReady()) {
      // Fallback to applying overrides manually if controller not ready
      return {
        ...rawFeatureFlags,
        ...overrides,
      };
    }
    try {
      const controller = getRemoteFeatureFlagController();
      if (!controller) {
        // Fallback to applying overrides manually if controller not available
        return {
          ...rawFeatureFlags,
          ...overrides,
        };
      }
      // Use controller's getAllFlags() which properly merges remoteFeatureFlags and localOverrides
      // The controller's state includes localOverrides and abTestRawFlags at runtime
      return controller.getAllFlags() as FeatureFlagOverrides;
    } catch (error) {
      // Fallback to applying overrides manually if controller call fails
      console.warn(
        'Failed to get all flags from controller, using fallback:',
        error,
      );
      return {
        ...rawFeatureFlags,
        ...overrides,
      };
    }
  }, [rawFeatureFlags, overrides]);

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
      getOverride,
      getAllOverrides,
      applyOverrides,
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
      getOverride,
      getAllOverrides,
      applyOverrides,
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
