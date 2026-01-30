import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictBalance } from './usePredictBalance';
import type { RootNavigationProp } from '../../../../util/navigation/types';

interface UsePredictActionGuardOptions {
  providerId: string;
  navigation: RootNavigationProp;
}

interface ExecuteGuardedActionOptions {
  checkBalance?: boolean;
  attemptedAction?: string;
}

interface UsePredictActionGuardResult {
  executeGuardedAction: (
    action: () => void | Promise<void>,
    options?: ExecuteGuardedActionOptions,
  ) => void | Promise<void>;
  isEligible: boolean;
  hasNoBalance: boolean;
}

export const usePredictActionGuard = ({
  providerId,
  navigation,
}: UsePredictActionGuardOptions): UsePredictActionGuardResult => {
  const { isEligible } = usePredictEligibility({ providerId });
  const { hasNoBalance } = usePredictBalance();

  const executeGuardedAction = useCallback(
    (
      action: () => void | Promise<void>,
      options: ExecuteGuardedActionOptions = {},
    ) => {
      const { checkBalance = false, attemptedAction } = options;

      if (!isEligible) {
        // Track geo-block analytics if attemptedAction is provided
        if (attemptedAction) {
          Engine.context.PredictController.trackGeoBlockTriggered({
            providerId,
            attemptedAction,
          });
        }

        navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.MODALS.UNAVAILABLE,
        });
        return;
      }

      if (checkBalance && hasNoBalance) {
        navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        });
        return;
      }

      return action();
    },
    [isEligible, hasNoBalance, navigation, providerId],
  );

  return {
    executeGuardedAction,
    isEligible,
    hasNoBalance,
  };
};
