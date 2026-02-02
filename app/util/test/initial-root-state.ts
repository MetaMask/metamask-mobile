import type { RootState } from '../../reducers';
import type { EngineState } from '../../core/Engine';
import { initialState as initialFiatOrdersState } from '../../reducers/fiatOrders';
import { initialState as initialSecurityState } from '../../reducers/security';
import { initialState as initialInpageProvider } from '../../core/redux/slices/inpageProvider';
import { initialState as confirmationMetrics } from '../../core/redux/slices/confirmationMetrics';
import { initialState as originThrottling } from '../../core/redux/slices/originThrottling';
import { initialState as initialBridgeState } from '../../core/redux/slices/bridge';
import { initialState as initialQrKeyringScannerState } from '../../core/redux/slices/qrKeyringScanner';
import { initialState as initialCardState } from '../../core/redux/slices/card';
import initialBackgroundState from './initial-background-state.json';
import { userInitialState } from '../../reducers/user';
import { initialNavigationState } from '../../reducers/navigation';
import { initialOnboardingState } from '../../reducers/onboarding';
import { initialState as initialPerformanceState } from '../../core/redux/slices/performance';
import { initialState as initialSampleCounterState } from '../../features/SampleFeature/reducers/sample-counter';
import { isTest } from './utils';
import { initialState as initialRewardsState } from '../../reducers/rewards';
import { initialState as initialNetworkConnectionBannerState } from '../../reducers/networkConnectionBanner';
// A cast is needed here because we use enums in some controllers, and TypeScript doesn't consider
// the string value of an enum as satisfying an enum type.
export const backgroundState: EngineState =
  initialBackgroundState as unknown as EngineState;

const initialRootState: RootState = {
  legalNotices: {
    isPna25Acknowledged: false,
    newPrivacyPolicyToastClickedOrClosed: false,
    newPrivacyPolicyToastShownDate: null,
  },
  collectibles: undefined,
  engine: { backgroundState },
  cronjobController: {
    storage: undefined,
  },
  privacy: undefined,
  bookmarks: undefined,
  browser: undefined,
  modals: undefined,
  settings: undefined,
  alert: undefined,
  transaction: undefined,
  user: userInitialState,
  onboarding: initialOnboardingState,
  notification: undefined,
  swaps: undefined,
  fiatOrders: initialFiatOrdersState,
  infuraAvailability: undefined,
  navigation: initialNavigationState,
  networkOnboarded: undefined,
  security: initialSecurityState,
  signatureRequest: {
    securityAlertResponse: undefined,
  },
  qrKeyringScanner: initialQrKeyringScannerState,
  sdk: {
    connections: {},
    approvedHosts: {},
    dappConnections: {},
    v2Connections: {},
  },
  experimentalSettings: undefined,
  rpcEvents: undefined,
  accounts: {
    reloadAccounts: false,
  },
  inpageProvider: initialInpageProvider,
  confirmationMetrics,
  originThrottling,
  notifications: {},
  bridge: initialBridgeState,
  banners: {
    dismissedBanners: [],
  },
  sampleCounter: initialSampleCounterState,
  card: initialCardState,
  rewards: initialRewardsState,
  networkConnectionBanner: initialNetworkConnectionBannerState,
};

if (isTest) {
  initialRootState.performance = initialPerformanceState;
}

export default initialRootState;
