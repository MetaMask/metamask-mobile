import NavigationService from '../../../../../core/NavigationService';
import ReduxService from '../../../../../core/redux';
import {
  resolveVenueImplementation,
  selectActiveVenue,
} from '../../implementation';
import type { PredictIntent } from './intents';
import { resolvePredictIntent } from './resolvePredictIntent';
import { toAppNavigation, type PredictIntentTarget } from './targets';

/** Performs a resolved navigation on the app navigator. */
const navigateFromService = (target: PredictIntentTarget): void => {
  const { routeName, params } = toAppNavigation(target);
  NavigationService.navigation.navigate(routeName, params);
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
