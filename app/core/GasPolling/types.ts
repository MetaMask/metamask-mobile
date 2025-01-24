import { Hex } from '@metamask/utils';

export interface GasTransactionProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  gasLimitHex: Hex;
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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export interface UseGasTransactionProps {
  /**
   * The gasSelected property is optional, as it is only relevant for 1559 transactions and not for legacy transactions.
   * When it is present, it can take values of ['low', 'medium', 'high', null].
   * If the value is null, it indicates that the advanced option is enabled.
   */
  gasSelected?: string | null;
  onlyGas?: boolean;

  /**
   * The type of transaction (EIP1559, legacy)
   */
  legacy?: boolean;
  /**
   * gas object for calculating the gas transaction cost
   */
  gasObject?: {
    suggestedGasLimit: string;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };
  /**
   * When legacy transaction gas limit or gas price values are updated in the edit mode, pass those values to this object.
   */
  gasObjectLegacy?: {
    legacyGasLimit?: string;
    suggestedGasPrice?: string;
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
    assetType?: string;
    ensRecipient?: string;
    id?: string;
    nonce?: string;
    proposedNonce?: string;
    readableValue?: string;
    selectedAsset: Record<string, unknown>;
    symbol?: string;
    transaction: {
      data?: string;
      from?: string;
      gas?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      to?: string;
      value?: string;
    };
    transactionFromName?: string;
    transactionTo?: string;
    transactionToName?: string;
    transactionValue?: string;
    type?: string;
    warningGasPriceHigh?: string;
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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionState: any;
  ticker: string;
  onlyGas?: boolean;
  multiLayerL1FeeTotal?: string;
  gas: {
    suggestedGasLimit: string;
    suggestedGasPrice?: string;
  };
}
