import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { PredictNavigationParamList } from '../types/navigation';
import { usePredictEligibility } from './usePredictEligibility';

interface UsePredictActionGuardOptions {
  providerId: string;
  navigation: NavigationProp<PredictNavigationParamList>;
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
  providerId,
  navigation,
}: UsePredictActionGuardOptions): UsePredictActionGuardResult => {
  const { isEligible } = usePredictEligibility({ providerId });

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
            providerId,
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
    [isEligible, navigation, providerId],
  );

  return {
    executeGuardedAction,
    isEligible,
  };
};
