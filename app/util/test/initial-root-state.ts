import type { RootState } from '../../reducers';
import type { EngineState } from '../../core/Engine';
import { initialState as initialFiatOrdersState } from '../../reducers/fiatOrders';
import { initialState as initialSecurityState } from '../../reducers/security';
import { initialState as initialInpageProvider } from '../../core/redux/slices/inpageProvider';
import { initialState as transactionMetrics } from '../../core/redux/slices/transactionMetrics';
import { initialState as originThrottling } from '../../core/redux/slices/originThrottling';
import { initialState as initialBridgeState } from '../../core/redux/slices/bridge';
import initialBackgroundState from './initial-background-state.json';
import { userInitialState } from '../../reducers/user';
import { initialNavigationState } from '../../reducers/navigation';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { initialState as initialMultichainSettingsState } from '../../reducers/multichain';
///: END:ONLY_INCLUDE_IF

// A cast is needed here because we use enums in some controllers, and TypeScript doesn't consider
// the string value of an enum as satisfying an enum type.
export const backgroundState: EngineState =
  initialBackgroundState as unknown as EngineState;

const initialRootState: RootState = {
  legalNotices: undefined,
  collectibles: undefined,
  engine: { backgroundState },
  privacy: undefined,
  bookmarks: undefined,
  browser: undefined,
  modals: undefined,
  settings: undefined,
  alert: undefined,
  transaction: undefined,
  user: userInitialState,
  wizard: undefined,
  onboarding: undefined,
  notification: undefined,
  swaps: undefined,
  fiatOrders: initialFiatOrdersState,
  infuraAvailability: undefined,
  navigation: initialNavigationState,
  networkOnboarded: undefined,
  security: initialSecurityState,
  signatureRequest: undefined,
  sdk: {
    connections: {},
    approvedHosts: {},
    dappConnections: {},
  },
  experimentalSettings: undefined,
  rpcEvents: undefined,
  accounts: undefined,
  inpageProvider: initialInpageProvider,
  transactionMetrics,
  originThrottling,
  notifications: {},
  bridge: initialBridgeState,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  multichainSettings: initialMultichainSettingsState,
  ///: END:ONLY_INCLUDE_IF
};

export default initialRootState;
