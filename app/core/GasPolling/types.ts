export interface GasTransactionProps {
  error: any;
  estimatedBaseFee: string;
  estimatedBaseFeeHex: string;
  /**
   * The max gas fee in the selected currency.
   */
  gasFeeMaxConversion: string;
  /**
   * The min gas fee in the selected currency.
   */
  gasFeeMinConversion: string;
  /**
   * Max gas fee in native currency.
   */
  gasFeeMaxNative: string;
  /**
   * Min gas fee in native currency.
   */
  gasFeeMinNative: string;
  /**
   * Gas limit for the transaction. Default is 21000.
   */
  suggestedGasLimit: string;
  /**
   * The gas limit in hexadecimal format.
   */
  gasLimitHex: string;
  /**
   * The time estimate to complete the transaction.
   */
  timeEstimate: string;
  /**
   * The time estimate to complete transaction in color (green, red, grey).
   */
  timeEstimateColor: string;
  /**
   * The time estimate to complete transaction in descriptive text (maybe, likely, very_likely).
   */
  timeEstimateId: string;
  /**
   * The gas price
   */
  renderableGasFeeMaxNative: string;
  /**
   * The gas price in the native currency.
   */
  renderableGasFeeMinNative: string;
  /**
   * Max fee per gas for the transaction.
   */
  suggestedMaxFeePerGas: string;
  /**
   * Max fee per gas for the transaction in hexadecimal format.
   */
  suggestedMaxFeePerGasHex: string;
  /**
   * Max priority fee per gas for the transaction.
   */
  suggestedMaxPriorityFeePerGas: string;
  /**
   * Max priority fee per gas for the transaction in hexadecimal format.
   */
  suggestedMaxPriorityFeePerGasHex: string;
  maxPriorityFeeNative: string;
  maxPriorityFeeConversion: string;
  renderableGasFeeMaxConversion: string;
  renderableGasFeeMinConversion: string;
  renderableMaxFeePerGasConversion: string;
  renderableMaxFeePerGasNative: string;
  renderableMaxPriorityFeeConversion: string;
  renderableMaxPriorityFeeNative: string;
  suggestedEstimatedGasLimit: string | undefined;
  totalMaxHex: string;
}

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

export interface UseGasTransactionProps extends GasTransactionProps {
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
   * the gas transaction props
   */
  gasData: GasTransactionProps;
  /**
   * gas object for calculating the gas transaction cost
   */
  gasObject: {
    legacyGasLimit: string;
    suggestedGasPrice: any;
    suggestedGasLimit?: string;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };

  multiLayerL1FeeTotal?: string;
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
  transactionState: {
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
  };
  contractExchangeRates: Record<string, unknown>;
}

export interface GetEIP1559TransactionDataProps extends TransactionSharedProps {
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

export interface LegacyProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  transactionState: any;
  ticker: string;
  suggestedGasPrice: any;
  suggestedGasLimit: string;
  onlyGas?: boolean;
  multiLayerL1FeeTotal?: string;
}
