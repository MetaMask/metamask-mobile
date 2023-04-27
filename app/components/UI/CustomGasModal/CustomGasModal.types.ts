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
  updateParent: (state: any) => void;
  legacy: boolean;
  legacyGasObj: {
    legacyGasLimit: string;
    suggestedGasPrice: string;
  };
  EIP1559GasObj: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
    suggestedGasLimit: string;
  };
  EIP1559GasTxn: {
    suggestedGasLimit: string;
    totalMaxHex: string;
    error: any;
  };
}
