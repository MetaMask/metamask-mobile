import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { usePredictNavigation } from '../../../Predict/hooks/usePredictNavigation';
import { usePredictImplementation } from '../../implementation';
import type { PredictIntent } from './intents';
import { resolvePredictIntent } from './resolvePredictIntent';

export interface PredictEntryActions {
  /**
   * Opens Predict for an intent with the calling component's navigation.
   *
   * @returns Whether it navigated. `false` means the intent is unavailable
   * for the Active Venue, and nothing happened.
   */
  openPredict: (intent: PredictIntent) => boolean;
  /**
   * Whether `openPredict` would navigate for this intent. A surface hides an
   * entry whose intent the Active Venue cannot open.
   */
  canOpenPredict: (intent: PredictIntent) => boolean;
}

/**
 * Predict entry actions for components outside Predict. The legacy branch
 * navigates with today's legacy routes and `usePredictNavigation`; the
 * PredictNext branch with PredictNext routes for the Active Venue.
 */
export const usePredictEntryActions = (): PredictEntryActions => {
  const navigation = useNavigation<AppNavigationProp>();
  const { navigateToMarketDetails } = usePredictNavigation();
  const implementation = usePredictImplementation();

  const openPredict = useCallback(
    (intent: PredictIntent): boolean => {
      const resolution = resolvePredictIntent(intent, implementation);
      if (resolution.status !== 'ready') {
        return false;
      }
      const { target } = resolution;
      switch (target.kind) {
        case 'predict':
          navigation.navigate(Routes.PREDICT.ROOT, target.params);
          break;
        case 'predictModals':
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, target.params);
          break;
        case 'legacyMarketDetails':
          navigateToMarketDetails(target.params, { throughRoot: true });
          break;
      }
      return true;
    },
    [implementation, navigateToMarketDetails, navigation],
  );

  const canOpenPredict = useCallback(
    (intent: PredictIntent): boolean =>
      resolvePredictIntent(intent, implementation).status === 'ready',
    [implementation],
  );

  return useMemo(
    () => ({ openPredict, canOpenPredict }),
    [canOpenPredict, openPredict],
  );
};
