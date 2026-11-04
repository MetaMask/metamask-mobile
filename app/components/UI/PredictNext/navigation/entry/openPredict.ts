import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import ReduxService from '../../../../../core/redux';
import {
  resolveVenueImplementation,
  selectActiveVenue,
} from '../../implementation';
import type { PredictIntent } from './intents';
import { resolvePredictIntent } from './resolvePredictIntent';
import type { PredictIntentTarget } from './targets';

/**
 * Performs a resolved navigation on the app navigator. The legacy market
 * details target makes the call `usePredictNavigation` makes `throughRoot`.
 */
const navigateFromService = (target: PredictIntentTarget): void => {
  const { navigation } = NavigationService;
  switch (target.kind) {
    case 'predict':
      navigation.navigate(Routes.PREDICT.ROOT, target.params);
      return;
    case 'predictModals':
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, target.params);
      return;
    case 'legacyMarketDetails':
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: target.params,
      });
  }
};

/**
 * Opens Predict for an intent, from code that has no component: deep-link
 * handlers, sagas, services. Components use `usePredictEntryActions` so the
 * navigation is their own. Resolves the Active Venue at call time.
 *
 * @returns Whether it navigated. `false` means the intent is unavailable for
 * the Active Venue, and nothing happened.
 */
export const openPredict = (intent: PredictIntent): boolean => {
  const resolution = resolvePredictIntent(
    intent,
    resolveVenueImplementation(
      selectActiveVenue(ReduxService.store.getState()),
    ),
  );
  if (resolution.status !== 'ready') {
    return false;
  }
  navigateFromService(resolution.target);
  return true;
};
