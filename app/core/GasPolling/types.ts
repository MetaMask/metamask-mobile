import { GAS_TIME_OPTIONS, AVAILABLE_GAS_OPTIONS } from '../../types/gas';
import BigNumber from 'bignumber.js';
import { BN } from 'ethereumjs-util';
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
  timeEstimateId: GasTransactionProps;
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

interface GasFeeLevelOptions {
  maxWaitTimeEstimate: number;
  minWaitTimeEstimate: number;
  suggestedMaxFeePerGas: string;
  suggestedMaxPriorityFeePerGas: string;
}

export interface GasFeeOptions {
  baseFeeTrend: string;
  estimatedBaseFee: string;
  low: GasFeeLevelOptions;
  medium: GasFeeLevelOptions;
  high: GasFeeLevelOptions;
  historicalBaseFeeRange: string[];
  historicalPriorityFeeRange: string[];
  latestPriorityFeeRange: string[];
  networkCongestion: number;
  priorityFeeTrend: string;
}

export interface UseGasTransactionProps {
  /**
   * The gasSelected property is optional, as it is only relevant for 1559 transactions and not for legacy transactions.
   * When it is present, it can take values of ['low', 'medium', 'high', null].
   * If the value is null, it indicates that the advanced option is enabled.
   */
  gasSelected?: AVAILABLE_GAS_OPTIONS | null;
  onlyGas?: boolean;

  /**
   * The type of transaction (EIP1559, legacy)
   */
  legacy?: boolean;
  /**
   * gas object for calculating the gas transaction cost
   */
  gasObject?: {
    suggestedGasLimit?: string;
    suggestedMaxPriorityFeePerGas: string;
    suggestedMaxFeePerGas: string | undefined;
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
  gasFeeEstimates: GasFeeOptions | Record<string, never>;
  /**
   * if the selected option is not null, use the equivalent from the gasFeeEstimates object. Else, handle the gasFeeEstimates object differently.
   */
  gas: {
    /**
     * The selected gas value (low, medium, high). Gas value can be null when the advanced option is modified.
     */
    selectedOption: AVAILABLE_GAS_OPTIONS | null;
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

export interface GetEIP1559TransactionData {
  gasFeeMinNative: string | number | BigNumber;
  renderableGasFeeMinNative: string;
  gasFeeMinConversion: string | number | BigNumber;
  renderableGasFeeMinConversion: string;
  gasFeeMaxNative: string | number | BigNumber;
  renderableGasFeeMaxNative: string;
  gasFeeMaxConversion: string | number | BigNumber;
  renderableGasFeeMaxConversion: string;
  maxPriorityFeeNative: string | number | BigNumber;
  renderableMaxPriorityFeeNative: string;
  maxPriorityFeeConversion: string | number | BigNumber;
  renderableMaxPriorityFeeConversion: string;
  renderableMaxFeePerGasNative: string;
  renderableMaxFeePerGasConversion: string;
  timeEstimate: string;
  timeEstimateColor: string;
  timeEstimateId: GAS_TIME_OPTIONS;
  estimatedBaseFee: any;
  estimatedBaseFeeHex: string | number | BigNumber;
  suggestedMaxPriorityFeePerGas: string;
  suggestedMaxPriorityFeePerGasHex: string | number | BigNumber;
  suggestedMaxFeePerGas: string;
  suggestedMaxFeePerGasHex: string | number | BigNumber;
  gasLimitHex: string;
  suggestedGasLimit: string;
  suggestedEstimatedGasLimit?: any;
  totalMaxHex: string | BigNumber;
  totalMinNative?: any;
  renderableTotalMinNative?: string;
  totalMinConversion?: any;
  renderableTotalMinConversion?: string;
  totalMaxNative?: any;
  renderableTotalMaxNative?: string;
  totalMaxConversion?: any;
  renderableTotalMaxConversion?: string;
  totalMinHex?: string | BigNumber;
}

export interface LegacyProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  transactionState: any;
  ticker: string;
  onlyGas?: boolean;
  multiLayerL1FeeTotal?: string;
  gas: {
    suggestedGasLimit: string;
    suggestedGasPrice?: string;
  };
}

export interface GetLegacyTransactionData {
  transactionFeeFiat: string;
  transactionFee: string;
  transactionTotalAmount?: string;
  transactionTotalAmountFiat?: string;
  suggestedGasPrice: string | undefined;
  suggestedGasPriceHex: string | number | BigNumber;
  suggestedGasLimit: string;
  suggestedGasLimitHex: string;
  totalHex: BN;
}
