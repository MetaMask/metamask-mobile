import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../selectors/featureFlagController';
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
import type { FeatureFlagOverrideControllerState } from '../core/Engine/controllers/feature-flag-override-controller';
import { whenEngineReady } from '../core/SDKConnectV2/utils/when-engine-ready';

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
  const toastContext = useContext(ToastContext);
  const toastRef = toastContext?.toastRef;

  // Get the FeatureFlagOverrideController from Engine (may not be available initially)
  const [controller, setController] = useState<
    typeof Engine.context.FeatureFlagOverrideController | null
  >(null);

  // Sync overrides from controller state
  const [overrides, setOverrides] = useState<FeatureFlagOverrides>({});

  // Wait for Engine to be initialized and get the controller
  useEffect(() => {
    let isMounted = true;

    const initializeController = async () => {
      try {
        // Wait for Engine to be ready
        await whenEngineReady();

        if (!isMounted) {
          return;
        }

        // Get the controller once Engine is ready
        const engineController = Engine.context.FeatureFlagOverrideController;
        setController(engineController);
        setOverrides(engineController.state.overrides);
      } catch (error) {
        // Engine initialization failed or component unmounted
        // Silently handle - component will work with local state
      }
    };

    // Try to get controller immediately (in case Engine is already initialized)
    try {
      const engineController = Engine.context.FeatureFlagOverrideController;
      setController(engineController);
      setOverrides(engineController.state.overrides);
    } catch (error) {
      // Engine not initialized yet, wait for it
      initializeController();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to controller state changes once controller is available
  useEffect(() => {
    if (!controller) {
      return;
    }

    const handleStateChange = (
      state: FeatureFlagOverrideControllerState,
    ): void => {
      setOverrides(state.overrides);
    };

    try {
      Engine.controllerMessenger.subscribe(
        'FeatureFlagOverrideController:stateChange',
        handleStateChange,
      );

      return () => {
        try {
          Engine.controllerMessenger.unsubscribe(
            'FeatureFlagOverrideController:stateChange',
            handleStateChange,
          );
        } catch (error) {
          // Engine might be destroyed, ignore unsubscribe errors
        }
      };
    } catch (error) {
      // Engine might not be available, ignore subscription errors
      return undefined;
    }
  }, [controller]);

  const setOverride = useCallback(
    (key: string, value: unknown) => {
      if (controller) {
        controller.setOverride(key, value);
      }
    },
    [controller],
  );

  const removeOverride = useCallback(
    (key: string) => {
      if (controller) {
        controller.removeOverride(key);
      }
    },
    [controller],
  );

  const clearAllOverrides = useCallback(() => {
    if (controller) {
      controller.clearAllOverrides();
    }
  }, [controller]);

  const hasOverride = useCallback(
    (key: string): boolean => {
      if (controller) {
        return controller.hasOverride(key);
      }
      return key in overrides;
    },
    [controller, overrides],
  );

  const getOverride = useCallback(
    (key: string): unknown => {
      if (controller) {
        return controller.getOverride(key);
      }
      return overrides[key];
    },
    [controller, overrides],
  );

  const getAllOverrides = useCallback((): FeatureFlagOverrides => {
    if (controller) {
      return controller.getAllOverrides();
    }
    return { ...overrides };
  }, [controller, overrides]);

  const applyOverrides = useCallback(
    (originalFlags: FeatureFlagOverrides): FeatureFlagOverrides => {
      if (controller) {
        return controller.applyOverrides(originalFlags);
      }
      return {
        ...originalFlags,
        ...overrides,
      };
    },
    [controller, overrides],
  );

  const featureFlagsWithOverrides = useMemo(
    () => applyOverrides(rawFeatureFlags),
    [rawFeatureFlags, applyOverrides],
  );

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

  const getOverrideCount = useCallback((): number => {
    if (controller) {
      return controller.getOverrideCount();
    }
    return Object.keys(overrides).length;
  }, [controller, overrides]);

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
