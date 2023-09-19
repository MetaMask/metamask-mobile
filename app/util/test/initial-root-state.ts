import type { RootState } from '../../reducers';
import type { EngineState } from '../../core/Engine';
import { initialState as initialFiatOrdersState } from '../../reducers/fiatOrders';
import { initialState as initialSecurityState } from '../../reducers/security';
import initialBackgroundState from './initial-background-state.json';

// Cast because TypeScript is incorrectly inferring the type of this JSON object
const backgroundState: EngineState = initialBackgroundState as any;

const initialRootState: RootState = {
  collectibles: undefined,
  engine: { backgroundState },
  privacy: undefined,
  bookmarks: undefined,
  browser: undefined,
  modals: undefined,
  settings: undefined,
  alert: undefined,
  transaction: undefined,
  user: undefined,
  wizard: undefined,
  onboarding: undefined,
  notification: undefined,
  swaps: undefined,
  fiatOrders: initialFiatOrdersState,
  infuraAvailability: undefined,
  navigation: undefined,
  networkOnboarded: undefined,
  security: initialSecurityState,
  experimentalSettings: undefined,
};

export default initialRootState;
