import bookmarksReducer from './bookmarks';
import browserReducer from './browser';
import engineReducer from '../core/redux/slices/engine';
import privacyReducer from './privacy';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import securityAlertsReducer, { SecurityAlertsState } from './security-alerts';
import legalNoticesReducer, { LegalNoticesState } from './legalNotices';
import userReducer, { UserState } from './user';
import onboardingReducer, { OnboardingState } from './onboarding';
import fiatOrders from './fiatOrders';
import swapsReducer from './swaps';
import notificationReducer from './notification';
import infuraAvailabilityReducer from './infuraAvailability';
import collectiblesReducer from './collectibles';
import navigationReducer, { NavigationState } from './navigation';
import networkOnboardReducer from './networkSelector';
import securityReducer, { SecurityState } from './security';
import accountsReducer, { iAccountEvent as AccountsState } from './accounts';
import { combineReducers, Reducer } from 'redux';
import experimentalSettingsReducer from './experimentalSettings';
import { EngineState } from '../core/Engine';
import rpcEventReducer from './rpcEvents';
import sdkReducer from './sdk';
import inpageProviderReducer from '../core/redux/slices/inpageProvider';
import qrKeyringScannerReducer from '../core/redux/slices/qrKeyringScanner';
import confirmationMetricsReducer from '../core/redux/slices/confirmationMetrics';
import originThrottlingReducer from '../core/redux/slices/originThrottling';
import notificationsAccountsProvider from '../core/redux/slices/notifications';
import cronjobControllerReducer from '../core/redux/slices/cronjobController';
import networkConnectionBannerReducer, {
  NetworkConnectionBannerState,
} from './networkConnectionBanner';

import bannersReducer, { BannersState } from './banners';
import bridgeReducer from '../core/redux/slices/bridge';
import performanceReducer, {
  PerformanceState,
} from '../core/redux/slices/performance';
///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
import sampleCounterReducer from '../features/SampleFeature/reducers/sample-counter';
///: END:ONLY_INCLUDE_IF
import cardReducer from '../core/redux/slices/card';
import rewardsReducer, { RewardsState } from './rewards';
import { isTest } from '../util/test/utils';

/**
 * Infer state from a reducer
 *
 * @template reducer A reducer function
 */
export type StateFromReducer<reducer> =
  reducer extends Reducer<
    infer State,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >
    ? State
    : never;

// TODO: Convert all reducers to valid TypeScript Redux reducers, and add them
// to this type. Once that is complete, we can automatically generate this type
// using the `StateFromReducersMapObject` type from redux.
export interface RootState {
  legalNotices: LegalNoticesState;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectibles: any;
  engine: { backgroundState: EngineState };
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  privacy: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookmarks: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modals: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alert: any;
  securityAlerts: SecurityAlertsState;
  user: UserState;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onboarding: OnboardingState;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notification: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  swaps: any;
  fiatOrders: StateFromReducer<typeof fiatOrders>;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  infuraAvailability: any;
  navigation: NavigationState;
  // The networkOnboarded reducer is TypeScript but not yet a valid reducer
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkOnboarded: any;
  security: SecurityState;
  sdk: StateFromReducer<typeof sdkReducer>;
  // The experimentalSettings reducer is TypeScript but not yet a valid reducer
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimentalSettings: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcEvents: any;
  accounts: AccountsState;
  inpageProvider: StateFromReducer<typeof inpageProviderReducer>;
  confirmationMetrics: StateFromReducer<typeof confirmationMetricsReducer>;
  originThrottling: StateFromReducer<typeof originThrottlingReducer>;
  notifications: StateFromReducer<typeof notificationsAccountsProvider>;
  bridge: StateFromReducer<typeof bridgeReducer>;
  qrKeyringScanner: StateFromReducer<typeof qrKeyringScannerReducer>;
  banners: BannersState;
  card: StateFromReducer<typeof cardReducer>;
  performance?: PerformanceState;
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  sampleCounter: StateFromReducer<typeof sampleCounterReducer>;
  ///: END:ONLY_INCLUDE_IF
  cronjobController: StateFromReducer<typeof cronjobControllerReducer>;
  rewards: RewardsState;
  networkConnectionBanner: NetworkConnectionBannerState;
}

const baseReducers = {
  legalNotices: legalNoticesReducer,
  collectibles: collectiblesReducer,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: engineReducer as any,
  privacy: privacyReducer,
  bookmarks: bookmarksReducer,
  browser: browserReducer,
  modals: modalsReducer,
  settings: settingsReducer,
  alert: alertReducer,
  securityAlerts: securityAlertsReducer,
  user: userReducer,
  onboarding: onboardingReducer,
  notification: notificationReducer,
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
  inpageProvider: inpageProviderReducer,
  originThrottling: originThrottlingReducer,
  notifications: notificationsAccountsProvider,
  bridge: bridgeReducer,
  banners: bannersReducer,
  card: cardReducer,
  confirmationMetrics: confirmationMetricsReducer,
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  sampleCounter: sampleCounterReducer,
  ///: END:ONLY_INCLUDE_IF
  qrKeyringScanner: qrKeyringScannerReducer,
  cronjobController: cronjobControllerReducer,
  rewards: rewardsReducer,
  networkConnectionBanner: networkConnectionBannerReducer,
};

if (isTest) {
  // @ts-expect-error - it's expected to not exist, it should only exist in not production environments
  baseReducers.performance = performanceReducer;
}

// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rootReducer = combineReducers<RootState, any>(baseReducers);

export default rootReducer;
