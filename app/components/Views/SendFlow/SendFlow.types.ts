/**
 * Send flow navigation parameters
 */

/** Send flow parameters */
export interface SendFlowParams {
  txMeta?: Record<string, unknown>;
}

/** Send amount parameters */
export interface SendAmountParams {
  txMeta?: Record<string, unknown>;
  selectedAsset?: Record<string, unknown>;
}

/** Send confirm parameters */
export interface SendConfirmParams {
  txMeta?: Record<string, unknown>;
}

/** Send recipient parameters */
export interface SendRecipientParams {
  txMeta?: Record<string, unknown>;
}

/** Send asset parameters */
export interface SendAssetParams {
  txMeta?: Record<string, unknown>;
}

/** Send parameters */
export interface SendParams {
  txMeta?: Record<string, unknown>;
  isFromTabBar?: boolean;
}
