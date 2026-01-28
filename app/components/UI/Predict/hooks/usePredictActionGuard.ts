import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../types/navigation';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictBalance } from './usePredictBalance';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictNavigation } from './usePredictNavigation';

interface UsePredictActionGuardOptions {
  providerId: string;
  navigation: NavigationProp<PredictNavigationParamList>;
  entryPoint?: PredictEntryPoint;
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
  entryPoint,
}: UsePredictActionGuardOptions): UsePredictActionGuardResult => {
  const { isEligible } = usePredictEligibility({ providerId });
  const { hasNoBalance } = usePredictBalance({ loadOnMount: true });
  const { navigateToUnavailableModal } = usePredictNavigation({
    navigation,
    entryPoint,
  });
  const { deposit, isDepositPending } = usePredictDeposit({
    providerId,
  });

  const executeGuardedAction = useCallback(
    (
      action: () => void | Promise<void>,
      options: ExecuteGuardedActionOptions = {},
    ) => {
      const { checkBalance = false, attemptedAction } = options;

      if (!isEligible) {
        if (attemptedAction) {
          Engine.context.PredictController.trackGeoBlockTriggered({
            providerId,
            attemptedAction,
          });
        }

        navigateToUnavailableModal();
        return;
      }

      if (checkBalance && hasNoBalance && !isDepositPending) {
        deposit();
        return;
      }

      return action();
    },
    [
      isEligible,
      hasNoBalance,
      isDepositPending,
      providerId,
      deposit,
      navigateToUnavailableModal,
    ],
  );

  return {
    executeGuardedAction,
    isEligible,
    hasNoBalance,
  };
};
