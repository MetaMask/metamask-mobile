export interface CustomGasModalProps {
  gasSelected: string;
  onChange: (gas: string) => void;
  onCancel: () => void;
  animateOnChange?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isAnimating: any;
  onlyGas: boolean;
  validateAmount: ({
    transaction,
    total,
  }: {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: any;
    total: string;
  }) => void;
  legacy: boolean;
  legacyGasData?: {
    legacyGasLimit: string;
    suggestedGasPrice: string;
  };
  EIP1559GasData?: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
    suggestedGasLimit: string;
  };
  EIP1559GasTxn?: {
    suggestedGasLimit: string;
    totalMaxHex: string;
  };
  onGasChanged: (gas: string) => void;
  onGasCanceled: (gas: string) => void;
  updateGasState: (state: {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gasTxn: any;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gasObj: any;
    gasSelect?: string;
    txnType: boolean;
  }) => void;
}
