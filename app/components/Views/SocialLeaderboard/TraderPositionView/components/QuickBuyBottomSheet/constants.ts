import { FeatureId } from '@metamask/bridge-controller';

// Debounce interval for quote fetches when user inputs change.
export const QUICKBUY_QUOTE_DEBOUNCE_MS = 400;

// Re-fetch quotes after this period of idle time so the confirm button never
// uses an expired quote. The controller does not poll for us since we call
// fetchQuotes directly.
export const QUICKBUY_QUOTE_STALE_TIMEOUT_MS = 30_000;

// Slippage defaults (expressed as percent strings to match the bridge hooks).
export const QUICKBUY_DEFAULT_SLIPPAGE = '0.5';
export const QUICKBUY_STABLECOIN_SLIPPAGE = '0.1';
export const QUICKBUY_SOLANA_SLIPPAGE = '1.0';

// FeatureId passed to BridgeController.fetchQuotes. Reuses PERPS so the backend
// applies the same routing / fee semantics TransactionPayController already uses
// for perpsDeposit.
export const QUICKBUY_FEATURE_ID = FeatureId.PERPS;
