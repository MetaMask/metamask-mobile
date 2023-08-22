export interface CustomGasModalProps {
  gasSelected: string;
  onChange: (gas: string) => void;
  onCancel: () => void;
  animateOnChange?: boolean;
  isAnimating: any;
  onlyGas: boolean;
  validateAmount: ({
    transaction,
    total,
  }: {
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
    gasTxn: any;
    gasObj: any;
    gasSelect?: string;
    txnType: boolean;
  }) => void;
}
