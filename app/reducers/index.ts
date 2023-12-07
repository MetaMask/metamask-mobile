import bookmarksReducer from '../redux/slices/bookmarks';
import browserReducer from '../redux/slices/browser';
import engineReducer from '../redux/slices/engine';
import privacyReducer from '../redux/slices/privacy';
import modalsReducer from '../redux/slices/modals';
import settingsReducer from '../redux/slices/settings';
import alertReducer from '../redux/slices/alert';
import transactionReducer from '../redux/slices/transaction';
import userReducer from '../redux/slices/user';
import wizardReducer from '../redux/slices/wizard';
import onboardingReducer from '../redux/slices/onboarding';
import fiatOrders from '../redux/slices/fiatOrders';
import swapsReducer from '../redux/slices/swaps';
import signatureRequestReducer from '../redux/slices/signatureRequest';
import notificationReducer from '../redux/slices/notification';
import infuraAvailabilityReducer from '../redux/slices/infuraAvailability';
import collectiblesReducer from '../redux/slices/collectibles';
import navigationReducer from '../redux/slices/navigation';
import networkOnboardReducer from '../redux/slices/networkSelector';
import securityReducer from '../redux/slices/security';
import { combineReducers, Reducer } from 'redux';
import experimentalSettingsReducer from '../redux/slices/experimentalSettings';
import { EngineState } from '../core/Engine';
/**
 * Infer state from a reducer
 *
 * @template reducer A reducer function
 */
export type StateFromReducer<reducer> = reducer extends Reducer<
  infer State,
  any
>
  ? State
  : never;

// TODO: Convert all reducers to valid TypeScript Redux reducers, and add them
// to this type. Once that is complete, we can automatically generate this type
// using the `StateFromReducersMapObject` type from redux.
export interface RootState {
  collectibles: any;
  engine: { backgroundState: EngineState | Record<string, never> };
  privacy: any;
  bookmarks: any;
  browser: any;
  modals: any;
  settings: any;
  alert: any;
  transaction: any;
  user: any;
  wizard: any;
  onboarding: any;
  notification: any;
  swaps: any;
  fiatOrders: StateFromReducer<typeof fiatOrders>;
  infuraAvailability: any;
  // The navigation reducer is TypeScript but not yet a valid reducer
  navigation: any;
  // The networkOnboarded reducer is TypeScript but not yet a valid reducer
  networkOnboarded: any;
  security: StateFromReducer<typeof securityReducer>;
  // The experimentalSettings reducer is TypeScript but not yet a valid reducer
  experimentalSettings: any;
  signatureRequest: any;
}

// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
const rootReducer = combineReducers<RootState, any>({
  collectibles: collectiblesReducer,
  engine: engineReducer as any,
  privacy: privacyReducer,
  bookmarks: bookmarksReducer, // attempting to define property on object that is not extensible
  browser: browserReducer,
  modals: modalsReducer,
  settings: settingsReducer,
  alert: alertReducer,
  transaction: transactionReducer,
  user: userReducer,
  wizard: wizardReducer,
  onboarding: onboardingReducer,
  notification: notificationReducer,
  signatureRequest: signatureRequestReducer,
  swaps: swapsReducer,
  fiatOrders,
  infuraAvailability: infuraAvailabilityReducer,
  navigation: navigationReducer,
  networkOnboarded: networkOnboardReducer,
  security: securityReducer,
  experimentalSettings: experimentalSettingsReducer,
});

export default rootReducer;
