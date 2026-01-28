import { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../types/navigation';
import { useIsInPredictNavigator } from './useIsInPredictNavigator';

export interface UsePredictNavigationOptions {
  entryPoint?: PredictEntryPoint;
}

export interface UsePredictNavigationResult {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  navigation: NavigationProp<PredictNavigationParamList>;
}

/**
 * Hook to wrap navigation with automatic stack routing for Predict feature.
 *
 * Automatically detects where the user currently is and routes through
 * PREDICT.ROOT when outside the Predict navigator.
 *
 * @param options - Navigation configuration
 * @param options.entryPoint - The entry point from which navigation was triggered
 * @returns Wrapped navigation methods
 *
 * @example
 * ```tsx
 * const { navigate } = usePredictNavigation({
 *   entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL
 * });
 *
 * navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
 *   market,
 *   outcome,
 *   outcomeToken,
 * });
 * ```
 */
export const usePredictNavigation = ({
  entryPoint,
}: UsePredictNavigationOptions = {}): UsePredictNavigationResult => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const isInPredictNavigator = useIsInPredictNavigator();

  const navigate = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      if (!isInPredictNavigator) {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen,
          params: {
            ...params,
            entryPoint,
          },
        });
      } else {
        navigation.navigate(screen, {
          ...params,
          entryPoint,
        });
      }
    },
    [isInPredictNavigator, navigation, entryPoint],
  );

  return {
    navigate,
    navigation,
  };
};
