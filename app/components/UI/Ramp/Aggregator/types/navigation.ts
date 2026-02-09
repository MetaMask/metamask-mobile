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
 * Deposit build quote parameters
 * Used by app/components/UI/Ramp/Deposit/Views/BuildQuote/BuildQuote.tsx
 */
export type { BuildQuoteParams as DepositBuildQuoteParams } from '../Views/BuildQuote/BuildQuote';

/**
 * Simple Ramp build quote parameters
 * Used by app/components/UI/Ramp/components/BuildQuote/BuildQuote.tsx
 */
export type { BuildQuoteParams as SimpleRampBuildQuoteParams } from '../../components/BuildQuote/BuildQuote';

/** Webview modal parameters - from the actual Deposit WebviewModal component */
export type { WebviewModalParams } from '../../Deposit/Views/Modals/WebviewModal';

/** KYC Webview modal parameters - extends WebviewModalParams with KYC-specific fields */
export type { KycWebviewModalParams } from '../../Deposit/Views/Modals/WebviewModal';
