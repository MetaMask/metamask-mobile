export interface GasFeeOptions {
  estimatedBaseFee: any;
  /**
   * This gasFeeEstimate object is returned from Codefi
   */
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
  transaction: {
    data: string | undefined;
    from: string | undefined;
    gas: string | undefined;
    gasPrice: string | undefined;
    maxFeePerGas: string | undefined;
    maxPriorityFeePerGas: string | undefined;
    to: string | undefined;
    value: string | undefined;
  };
  transactionFromName: string | undefined;
  transactionTo: string | undefined;
  transactionToName: string | undefined;
  transactionValue: string | undefined;
  type: string | undefined;
  warningGasPriceHigh: string | undefined;
}

export interface TransactionSharedProps {
  /**
   * The native token exchange rate against the selected currency
   */
  conversionRate: number;
  /**
   * The primary currency, either ETH or Fiat
   */
  currentCurrency: string;
  /**
   * The native token
   */
  nativeCurrency: string;
  /**
   * For UpdateEIP1559Transaction, the transactionState are undefined.
   */
  transactionState: TransactionStateProps;
  contractExchangeRates: Record<string, unknown>;
}

export interface UseGasTransactionProps extends TransactionSharedProps {
  /**
   * The selected gas value (low, medium, high). Gas value can be null when the advanced option is modified.
   */
  gasSelected: string | null;
  onlyGas?: boolean;

  /**
   * The type of transaction (EIP1559, legacy)
   */
  legacy?: boolean;
  /**
   * gas object for calculating the gas transaction fee
   */
  gasObject: {
    legacyGasLimit?: string;
    suggestedGasPrice?: any;
    suggestedGasLimit?: string;
    suggestedMaxFeePerGas?: string;
    suggestedMaxPriorityFeePerGas?: string;
  };
  multiLayerL1FeeTotal?: string;
  dappSuggestedEIP1559Gas?: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  dappSuggestedGasPrice?: string;
}

export interface EIP1559Props extends TransactionSharedProps {
  gasFeeEstimates: GasFeeOptions;
  /**
   * if the selected option is not null, use the equivalent from the gasFeeEstimates object. Else, handle the gasFeeEstimates object differently.
   */
  gas: {
    /**
     * The selected gas value (low, medium, high). Gas value can be null when the advanced option is modified.
     */
    selectedOption: string | null;
    maxWaitTimeEstimate: number;
    minWaitTimeEstimate: number;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };
  /**
   * Suggested gas limit. Default is 21000.
   * @default 21000
   */
  suggestedGasLimit: string;
  onlyGas?: boolean;
}

export interface LegacyProps extends TransactionSharedProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  transactionState: any;
  ticker: string;
  suggestedGasPrice?: any;
  suggestedGasLimit?: string;
  onlyGas?: boolean;
  multiLayerL1FeeTotal?: string;
  gas: {
    suggestedGasPrice: string;
    suggestedGasLimit: string;
  };
}
