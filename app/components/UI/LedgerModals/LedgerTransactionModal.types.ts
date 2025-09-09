export enum LedgerReplacementTxTypes {
  SPEED_UP = 'speedUp',
  CANCEL = 'cancel',
}

export interface ReplacementTxParams {
  type: LedgerReplacementTxTypes;
  eip1559GasFee?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export interface LedgerTransactionModalParams {
  onConfirmationComplete: (confirmed: boolean) => void;
  transactionId: string;
  deviceId: string;
  replacementParams?: ReplacementTxParams;
}
