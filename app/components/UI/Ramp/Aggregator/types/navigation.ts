/**
 * Ramp navigation parameters
 */

/** Ramp buy/sell parameters */
export interface RampBuySellParams {
  showBack?: boolean;
}

/** Ramp order details parameters */
export type { OrderDetailsParams as RampOrderDetailsParams } from '../Views/OrderDetails/OrderDetails';

/**
 * Ramp Aggregator build quote parameters
 * Used by app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.tsx
 */
export type { BuildQuoteParams as RampAggregatorBuildQuoteParams } from '../Views/BuildQuote/BuildQuote';

/**
 * Simple Ramp build quote parameters
 * Used by app/components/UI/Ramp/Views/BuildQuote/BuildQuote.tsx
 */
export type { BuildQuoteParams as SimpleRampBuildQuoteParams } from '../../Views/BuildQuote/BuildQuote';

/** Legacy deposit webview modal params (deposit navigator removed). */
export type {
  WebviewModalParams,
  KycWebviewModalParams,
} from '../../types/legacyNavigation';
