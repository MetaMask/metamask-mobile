import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../types/navigation';
import { PredictEventValues } from '../constants/eventNames';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictBalance } from './usePredictBalance';
import { usePredictDeposit } from './usePredictDeposit';

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

const isOutsidePredictNavigator = (entryPoint?: PredictEntryPoint): boolean =>
  entryPoint === PredictEventValues.ENTRY_POINT.CAROUSEL;

export const usePredictActionGuard = ({
  providerId,
  navigation,
  entryPoint,
}: UsePredictActionGuardOptions): UsePredictActionGuardResult => {
  const { isEligible } = usePredictEligibility({ providerId });
  const { hasNoBalance } = usePredictBalance();
  const { deposit, isDepositPending } = usePredictDeposit({
    providerId,
    stack: isOutsidePredictNavigator(entryPoint)
      ? Routes.PREDICT.ROOT
      : undefined,
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

        if (isOutsidePredictNavigator(entryPoint)) {
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MODALS.ROOT,
            params: {
              screen: Routes.PREDICT.MODALS.UNAVAILABLE,
            },
          });
        } else {
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.MODALS.UNAVAILABLE,
          });
        }
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
      navigation,
      providerId,
      deposit,
      entryPoint,
    ],
  );

  return {
    executeGuardedAction,
    isEligible,
    hasNoBalance,
  };
};
