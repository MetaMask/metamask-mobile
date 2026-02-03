/**
 * Bridge navigation parameters
 */

/** Custom slippage modal parameters */
export interface CustomSlippageModalParams {
  currentSlippage?: number;
  onSlippageChange?: (slippage: number) => void;
}

/** Transaction details block explorer parameters */
export interface TransactionDetailsBlockExplorerParams {
  url?: string;
}

/** Blockaid modal parameters */
export interface BlockaidModalParams {
  securityAlertResponse?: Record<string, unknown>;
}

/** Bridge transaction details parameters */
export interface BridgeTransactionDetailsParams {
  bridgeTxId?: string;
}
