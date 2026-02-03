/**
 * Ramp navigation parameters
 */

/** Ramp buy/sell parameters */
export interface RampBuySellParams {
  showBack?: boolean;
}

/** Ramp order details parameters */
export interface RampOrderDetailsParams {
  orderId?: string;
  redirectToOrders?: boolean;
}

/** Deposit build quote parameters */
export interface DepositBuildQuoteParams {
  animationEnabled?: boolean;
}

/** Webview modal parameters */
export interface WebviewModalParams {
  url?: string;
  title?: string;
}
