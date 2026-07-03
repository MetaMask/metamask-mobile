/**
 * Perps UI-only display constants
 *
 * These constants are purely for UI display purposes (fee labels, timing strings,
 * order book display defaults) and have zero controller-layer consumers.
 *
 * Protocol/trading constants remain in:
 * '@metamask/perps-controller/constants/hyperLiquidConfig'
 */

// MetaMask fee for deposits (temporary placeholder)
export const METAMASK_DEPOSIT_FEE = '$0.00';

// Withdrawal fees
export const HYPERLIQUID_WITHDRAWAL_FEE = 1; // $1 USD fixed fee
export const METAMASK_WITHDRAWAL_FEE = 0; // $0 - no MM fee for withdrawals
export const METAMASK_WITHDRAWAL_FEE_PLACEHOLDER = '$0.00'; // Display format

// Withdrawal timing
export const WITHDRAWAL_ESTIMATED_TIME = '5 minutes';

// Order book spread constants
export const ORDER_BOOK_SPREAD = {
  // Default bid/ask spread when real order book data is not available
  // This represents a 0.02% spread (2 basis points) which is typical for liquid markets
  DefaultBidMultiplier: 0.9999, // Bid price is 0.01% below current price
  DefaultAskMultiplier: 1.0001, // Ask price is 0.01% above current price
};

// Withdrawal constants (HyperLiquid-specific UI progress timing)
export const HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS = 30000; // 30 seconds progress update interval

// Market About section (TAT-2308)
// Number of lines the asset description is collapsed to before the
// "Read more" toggle is shown.
export const MARKET_ABOUT_COLLAPSED_NUMBER_OF_LINES = 3;
// Vertical rhythm between the About title, description and "Read more" toggle.
export const MARKET_ABOUT_SECTION_GAP = 12;
// Touch target padding around the "Read more" / "Show less" toggle.
export const MARKET_ABOUT_TOGGLE_HIT_SLOP = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
};
