export interface ReplacementTxParams {
  type: string;
  eip1559GasFee?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  legacyGasFee?: {
    gasPrice?: string;
  };
}
