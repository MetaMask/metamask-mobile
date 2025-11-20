import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { PredictNavigationParamList } from '../types/navigation';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictBalance } from './usePredictBalance';

interface UsePredictActionGuardOptions {
  providerId: string;
  navigation: NavigationProp<PredictNavigationParamList>;
}

interface ExecuteGuardedActionOptions {
  checkBalance?: boolean;
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
      const { checkBalance = false } = options;

      if (!isEligible) {
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
    [isEligible, hasNoBalance, navigation],
  );

  return {
    executeGuardedAction,
    isEligible,
    hasNoBalance,
  };
};
