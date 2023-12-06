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
import fiatOrders from './fiatOrders';
import swapsReducer from './swaps';
import signatureRequestReducer from './signatureRequest';
import notificationReducer from './notification';
import infuraAvailabilityReducer from '../redux/slices/infuraAvailability';
import collectiblesReducer from './collectibles';
import navigationReducer from './navigation';
import networkOnboardReducer from '../redux/slices/networkSelector';
import securityReducer from './security';
import { combineReducers, Reducer } from 'redux';
import experimentalSettingsReducer from './experimentalSettings';
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
  engine: engineReducer as any, //done
  privacy: privacyReducer, //done
  bookmarks: bookmarksReducer, // attempting to define property on object that is not extensible
  browser: browserReducer, //done
  modals: modalsReducer, // done
  settings: settingsReducer, //done
  alert: alertReducer, // done
  transaction: transactionReducer,
  user: userReducer, //done
  wizard: wizardReducer, // done
  onboarding: onboardingReducer, // done
  notification: notificationReducer,
  signatureRequest: signatureRequestReducer,
  swaps: swapsReducer,
  fiatOrders,
  infuraAvailability: infuraAvailabilityReducer, // done - redundant ?
  navigation: navigationReducer,
  networkOnboarded: networkOnboardReducer, // done
  security: securityReducer,
  experimentalSettings: experimentalSettingsReducer,
});

export default rootReducer;
