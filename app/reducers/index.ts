import bookmarksReducer from './bookmarks';
import browserReducer from './browser';
import engineReducer from '../core/redux/slices/engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import transactionReducer from './transaction';
import userReducer from './user';
import wizardReducer from './wizard';
import onboardingReducer from './onboarding';
import fiatOrders from './fiatOrders';
import swapsReducer from './swaps';
import signatureRequestReducer from './signatureRequest';
import notificationReducer from './notification';
import infuraAvailabilityReducer from './infuraAvailability';
import collectiblesReducer from './collectibles';
import navigationReducer from './navigation';
import networkOnboardReducer from './networkSelector';
import securityReducer from './security';
import { combineReducers, Reducer } from 'redux';
import experimentalSettingsReducer from './experimentalSettings';
import { EngineState } from '../core/Engine';
import rpcEventReducer from './rpcEvents';
import accountsReducer from './accounts';
import sdkReducer from './sdk';
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
  sdk: StateFromReducer<typeof sdkReducer>;
  // The experimentalSettings reducer is TypeScript but not yet a valid reducer
  experimentalSettings: any;
  signatureRequest: any;
  rpcEvents: any;
  accounts: any;
}

// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
const rootReducer = combineReducers<RootState, any>({
  collectibles: collectiblesReducer,
  engine: engineReducer as any,
  privacy: privacyReducer,
  bookmarks: bookmarksReducer,
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
  sdk: sdkReducer,
  experimentalSettings: experimentalSettingsReducer,
  rpcEvents: rpcEventReducer,
  accounts: accountsReducer,
});

export default rootReducer;
