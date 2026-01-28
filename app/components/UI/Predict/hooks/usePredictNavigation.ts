import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../types/navigation';
import { PredictEventValues } from '../constants/eventNames';
import { PredictMarket, PredictOutcome, PredictOutcomeToken } from '../types';

export interface UsePredictNavigationOptions {
  navigation: NavigationProp<PredictNavigationParamList>;
  entryPoint?: PredictEntryPoint;
}

export interface UsePredictNavigationResult {
  navigateToBuyPreview: (params: {
    market: PredictMarket;
    outcome: PredictOutcome;
    outcomeToken: PredictOutcomeToken;
  }) => void;
  navigateToUnavailableModal: () => void;
  isOutsidePredictNavigator: boolean;
}

/**
 * Helper function to determine if user is outside the Predict navigator
 */
const checkIsOutsidePredictNavigator = (
  entryPoint?: PredictEntryPoint,
): boolean => entryPoint === PredictEventValues.ENTRY_POINT.CAROUSEL;

/**
 * Hook to centralize Predict navigation logic.
 *
 * Automatically detects where the user currently is based on entry point,
 * and ensures proper navigation to Predict screens and modals.
 *
 * @param options - Navigation configuration
 * @param options.navigation - React Navigation navigation object
 * @param options.entryPoint - The entry point from which navigation was triggered
 * @returns Navigation helpers
 *
 * @example
 * ```tsx
 * const { navigateToBuyPreview, navigateToUnavailableModal } = usePredictNavigation({
 *   navigation,
 *   entryPoint: PredictEventValues.ENTRY_POINT.CAROUSEL
 * });
 *
 * navigateToBuyPreview({ market, outcome, outcomeToken });
 * navigateToUnavailableModal();
 * ```
 */
export const usePredictNavigation = ({
  navigation,
  entryPoint,
}: UsePredictNavigationOptions): UsePredictNavigationResult => {
  const isOutsidePredictNavigator = checkIsOutsidePredictNavigator(entryPoint);

  const navigateToBuyPreview = useCallback(
    (params: {
      market: PredictMarket;
      outcome: PredictOutcome;
      outcomeToken: PredictOutcomeToken;
    }) => {
      if (isOutsidePredictNavigator) {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            ...params,
            entryPoint,
          },
        });
      } else {
        navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
          ...params,
          entryPoint,
        });
      }
    },
    [navigation, entryPoint, isOutsidePredictNavigator],
  );

  const navigateToUnavailableModal = useCallback(() => {
    if (isOutsidePredictNavigator) {
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
  }, [navigation, isOutsidePredictNavigator]);

  return {
    navigateToBuyPreview,
    navigateToUnavailableModal,
    isOutsidePredictNavigator,
  };
};
