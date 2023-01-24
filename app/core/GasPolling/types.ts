export interface GasFeeOptions {
  estimatedBaseFee: any;
  gasFeeEstimates: {
    baseFeeTrend: string;
    estimatedBaseFee: string;
    low: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    medium: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    high: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    historicalBaseFeeRange: string[];
    historicalPriorityFeeRange: string[];
    latestPriorityFeeRange: string[];
    networkCongestion: number;
    priorityFeeTrend: string;
  };
}

interface GasTransaction {
  data: string | undefined;
  from: string | undefined;
  gas: string | undefined;
  gasPrice: string | undefined;
  maxFeePerGas: string | undefined;
  maxPriorityFeePerGas: string | undefined;
  to: string | undefined;
  value: string | undefined;
}

export interface TransactionStateProps {
  assetType: string | undefined;
  ensRecipient: string | undefined;
  id: string | undefined;
  nonce: string | undefined;
  paymentRequest: string | undefined;
  proposedNonce: string | undefined;
  readableValue: string | undefined;
  selectedAsset: Record<string, unknown>;
  symbol: string | undefined;
  transaction: GasTransaction;
  transactionFromName: string | undefined;
  transactionTo: string | undefined;
  transactionToName: string | undefined;
  transactionValue: string | undefined;
  type: string | undefined;
  warningGasPriceHigh: string | undefined;
}

interface GasObject {
  legacyGasLimit?: string;
  suggestedGasPrice?: string;
  suggestedGasLimit?: string;
  suggestedMaxFeePerGas?: string;
  suggestedMaxPriorityFeePerGas?: string;
}

/**
 * @type TransactionSharedProps
 * @property conversionRate - The native token exchange rate against the selected currency
 * @property currentCurrency - The primary currency, either ETH or Fiat
 * @property nativeCurrency - The native token
 * @property contractExchangeRates - Contract exchange rates
 */
export interface TransactionSharedProps {
  conversionRate: number;
  currentCurrency: string;
  nativeCurrency: string;
  transactionState: TransactionStateProps;
  contractExchangeRates: Record<string, unknown>;
}

/**
 * @type UseGasTransactionProps
 * @property gasSelected - Selected gas option
 * @property legacy - Legacy or EIP1559
 * @property gasObject - Gas object to get gas fee
 * @property dappSuggestedEIP1559Gas - Dapp suggested EIP1559 gas
 * @property dappSuggestedGasPrice - Dapp suggested gas price
 */
export interface UseGasTransactionProps extends TransactionSharedProps {
  gasSelected: string | null;
  onlyGas?: boolean;
  legacy?: boolean;
  gasObject: GasObject;
  multiLayerL1FeeTotal?: string;
  dappSuggestedEIP1559Gas?: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  dappSuggestedGasPrice?: string;
}

export interface EIP1559Props extends TransactionSharedProps {
  gasFeeEstimates: GasFeeOptions;
  gas: {
    selectedOption: string | null;
    maxWaitTimeEstimate: number;
    minWaitTimeEstimate: number;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };
  suggestedGasLimit: string;
  onlyGas?: boolean;
}

export interface LegacyProps extends TransactionSharedProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  transactionState: any;
  ticker: string;
  suggestedGasPrice?: string;
  suggestedGasLimit?: string;
  onlyGas?: boolean;
  multiLayerL1FeeTotal?: string;
  gas: {
    suggestedGasPrice: string;
    suggestedGasLimit: string;
  };
}
