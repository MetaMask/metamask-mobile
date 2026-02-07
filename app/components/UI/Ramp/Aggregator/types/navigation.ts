/**
 * Ramp navigation parameters
 */

import type { RampIntent } from '../../types';

/** Ramp buy/sell parameters */
export interface RampBuySellParams {
  showBack?: boolean;
}

/** Ramp order details parameters */
export interface RampOrderDetailsParams {
  orderId?: string;
  redirectToOrders?: boolean;
}

/**
 * Ramp Aggregator build quote parameters
 * Used by app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.tsx
 */
export interface RampAggregatorBuildQuoteParams extends RampIntent {
  showBack?: boolean;
}

/**
 * Deposit build quote parameters
 * Used by app/components/UI/Ramp/Deposit/Views/BuildQuote/BuildQuote.tsx
 */
export interface DepositBuildQuoteParams {
  shouldRouteImmediately?: boolean;
}

/**
 * Simple Ramp build quote parameters
 * Used by app/components/UI/Ramp/components/BuildQuote/BuildQuote.tsx
 */
export interface SimpleRampBuildQuoteParams {
  assetId?: string;
}

/** Webview modal parameters */
export interface WebviewModalParams {
  url?: string;
  title?: string;
}
