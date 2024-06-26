import type { RootState } from '../../reducers';
import type { EngineState } from '../../core/Engine';
import { initialState as initialFiatOrdersState } from '../../reducers/fiatOrders';
import { initialState as initialSecurityState } from '../../reducers/security';
import { initialState as initialInpageProvider } from '../../core/redux/slices/inpageProvider';
import { initialState as initialSmartTransactions } from '../../core/redux/slices/smartTransactions';
import { initialState as transactionMetrics } from '../../core/redux/slices/transactionMetrics';
import { initialState as originThrottling } from '../../core/redux/slices/originThrottling';
import initialBackgroundState from './initial-background-state.json';

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
  smartTransactions: initialSmartTransactions,
  user: {},
  wizard: undefined,
  onboarding: undefined,
  notification: undefined,
  swaps: undefined,
  fiatOrders: initialFiatOrdersState,
  infuraAvailability: undefined,
  navigation: undefined,
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
};

export default initialRootState;
