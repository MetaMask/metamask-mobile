import type { VenueCapabilities, PredictSettlementCurrency, PredictVenueInfo } from '../types';

/**
 * Kalshi venue capability flags for the POC. supportsClaims is false because
 * Kalshi settles automatically; supportsAutomaticSettlement is true so the UI
 * shows the resolved-winnings settlement activity row.
 */
export const KALSHI_CAPABILITIES: VenueCapabilities = {
  supportsDeposits: true,
  supportsWithdrawals: true,
  supportsClaims: false,
  supportsAutomaticSettlement: true,
  supportsAccountSetup: true,
  supportsLivePrices: false,
  supportsOrderbook: false,
  supportsCryptoReferencePrices: false,
};

export const KALSHI_SETTLEMENT_CURRENCY: PredictSettlementCurrency = {
  symbol: 'USDC',
  decimals: 6,
};

export const KALSHI_VENUE_INFO: PredictVenueInfo = {
  venueId: 'kalshi',
  name: 'Kalshi',
  settlementCurrency: KALSHI_SETTLEMENT_CURRENCY,
  capabilities: KALSHI_CAPABILITIES,
};

/**
 * Default backend base URL. Override at runtime via the dev-menu entry or
 * `process.env.PREDICT_KALSHI_BACKEND_URL`. iOS simulator can hit `localhost`
 * directly; Android needs `10.0.2.2` or a LAN IP.
 */
export const DEFAULT_BACKEND_BASE_URL =
  (process.env.PREDICT_KALSHI_BACKEND_URL as string | undefined) ??
  'http://localhost:8080';
