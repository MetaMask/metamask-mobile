/**
 * Crossmint memecoin checkout client (Phase 1 MVP).
 *
 * Phase 2 (onramp-api): replace direct Crossmint HTTP here with a Coinbase-shaped
 * `CrossmintProvider` in `va-mmcx-onramp-api` that maps:
 * - coverage ← GET /tokens (+ static countries/payments/limits)
 * - quotes ← create order with state: "draft"
 * - buy widget ← embedded-checkout URL from orderId/clientSecret
 * - orders ← get order (+ optional webhooks)
 * Mobile keeps the FOMO token → amount → WebView UX and swaps this data plane
 * to RampsController / buy-widget URL. Default-provider routing vs Transak
 * (US/EU) is a fast-follow after the connector lands.
 */
export {
  CROSSMINT_DEFAULT_MAX_SLIPPAGE_BPS,
  CROSSMINT_STAGING_XMEME_LOCATOR,
  CROSSMINT_STAGING_XMEME_TOKEN,
  CROSSMINT_STAGING_XMEME_MARKET_DATA,
  DEMO_MEMECOIN_CATALOG_STUBS,
  CROSSMINT_USD_AMOUNT_PRESETS,
  SOLANA_MAINNET_CAIP_CHAIN_ID,
} from './constants';
export {
  getCrossmintBaseUrl,
  getCrossmintClientApiKey,
  getCrossmintEnvironment,
  isCrossmintConfigured,
} from './config';
export {
  fetchCrossmintMemecoinTokens,
  createCrossmintOrder,
  getCrossmintOrder,
} from './api';
export { buildCrossmintCheckoutUrl } from './buildCheckoutUrl';
export {
  parseCrossmintCheckoutMessage,
  isCrossmintPaymentCompleted,
  isCrossmintPaymentInProgress,
  getCrossmintFailureMessage,
} from './parseCheckoutMessage';
export {
  parseTokenLocator,
  toMemecoinToken,
  mergeStagingXmeme,
  mergeDemoMemecoinStubs,
  crossmintChainToCaipChainId,
  crossmintLocatorToCaipAssetId,
} from './tokenLocator';
export type {
  CrossmintMemecoinToken,
  CrossmintCreateOrderResponse,
  CrossmintCheckoutMessage,
  CrossmintOrder,
  CrossmintEnvironment,
} from './types';
