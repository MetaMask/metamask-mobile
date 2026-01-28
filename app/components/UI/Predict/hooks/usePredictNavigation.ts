import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../types/navigation';
import { PredictEventValues } from '../constants/eventNames';

export interface UsePredictNavigationOptions {
  navigation: NavigationProp<PredictNavigationParamList>;
  entryPoint?: PredictEntryPoint;
}

export interface UsePredictNavigationResult {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  isOutsidePredictNavigator: boolean;
}

/**
 * Hook to wrap navigation with automatic stack routing for Predict feature.
 *
 * Automatically detects where the user currently is and routes through
 * PREDICT.ROOT when outside the Predict navigator.
 *
 * @param options - Navigation configuration
 * @param options.navigation - React Navigation navigation object
 * @param options.entryPoint - The entry point from which navigation was triggered
 * @returns Wrapped navigation methods
 *
 * @example
 * ```tsx
 * const { navigate } = usePredictNavigation({
 *   navigation,
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
  navigation,
  entryPoint,
}: UsePredictNavigationOptions): UsePredictNavigationResult => {
  const isOutsidePredictNavigator =
    entryPoint === PredictEventValues.ENTRY_POINT.CAROUSEL;

  const navigate = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      if (isOutsidePredictNavigator) {
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
    [navigation, entryPoint, isOutsidePredictNavigator],
  );

  return {
    navigate,
    isOutsidePredictNavigator,
  };
};
