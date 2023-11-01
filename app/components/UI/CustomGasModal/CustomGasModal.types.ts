import { SELECT_GAS_OPTIONS } from '../../../types/gas';

interface EIP1559GasData {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  suggestedMaxFeePerGas: string;
  suggestedMaxPriorityFeePerGas: string;
  suggestedGasLimit: string;
}

type EIP1559GasDataGasOption = {
  [key in SELECT_GAS_OPTIONS]: EIP1559GasData;
} & EIP1559GasData;

export interface CustomGasModalProps {
  gasSelected: SELECT_GAS_OPTIONS;
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
  EIP1559GasData?: EIP1559GasDataGasOption;
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
