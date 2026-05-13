export * from './types';
export {
  default,
  useHeadlessBuy,
  getChainIdFromAssetId,
} from './useHeadlessBuy';
export {
  closeSession,
  createSession,
  endSession,
  getActiveSessionId,
  getSession,
  setStatus,
} from './sessionRegistry';
export { useHeadlessSessionDismissal } from './useHeadlessSessionDismissal';
export {
  awaitOrderTerminalState,
  AwaitOrderTerminalStatePrerequisitesError,
  getOrder,
  isTerminalOrderStatus,
  OrderTerminalStateTimeoutError,
  refreshOrder,
  RefreshOrderUnresolvableError,
} from './orderTerminalState';
// Static (no-network) bounds lookup. Re-exported here so non-React consumers
// (e.g. MetaMask Pay's `TransactionPayController`) can pre-validate a fiat
// amount against `(provider, fiatCurrency, paymentMethodId)` bounds before
// asking the network for quotes. `getQuotes` itself runs this check
// internally when `params.providerIds` is set (see useHeadlessBuy.ts) —
// the export is for consumers that need it standalone (e.g. disabling a
// "Get quote" button while the user types).
export {
  getProviderBuyLimit,
  type ProviderBuyLimit,
} from '../utils/providerLimits';
