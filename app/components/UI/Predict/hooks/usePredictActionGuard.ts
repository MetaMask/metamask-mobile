import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { usePredictEligibility } from './usePredictEligibility';

interface UsePredictActionGuardOptions {
  navigation: AppNavigationProp;
}

interface ExecuteGuardedActionOptions {
  attemptedAction?: string;
}

interface UsePredictActionGuardResult {
  executeGuardedAction: (
    action: () => void | Promise<void>,
    options?: ExecuteGuardedActionOptions,
  ) => void | Promise<void>;
  isEligible: boolean;
}

export const usePredictActionGuard = ({
  navigation,
}: UsePredictActionGuardOptions): UsePredictActionGuardResult => {
  const { isEligible } = usePredictEligibility();

  const executeGuardedAction = useCallback(
    (
      action: () => void | Promise<void>,
      options: ExecuteGuardedActionOptions = {},
    ) => {
      const { attemptedAction } = options;

      if (!isEligible) {
        // Track geo-block analytics if attemptedAction is provided
        if (attemptedAction) {
          Engine.context.PredictController.trackGeoBlockTriggered({
            attemptedAction,
          });
        }

        navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.MODALS.UNAVAILABLE,
        });
        return;
      }

      return action();
    },
    [isEligible, navigation],
  );

  return {
    executeGuardedAction,
    isEligible,
  };
};
