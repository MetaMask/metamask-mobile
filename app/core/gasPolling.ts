import { useEffect, useState } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Engine from './Engine';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import { fromWei } from '../util/number';
import {
  parseTransactionEIP1559,
  parseTransactionLegacy,
} from '../util/transactions';

/**
 *
 * @param {string} token Expects a token and when it is not provided, a random token is generated.
 * @returns the token that is used to identify the gas polling.
 */
export const startGasPolling = async (token?: string) => {
  const { GasFeeController }: any = Engine.context;
  const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(
    token,
  );
  return pollToken;
};

/**
 *
 * @returns clears the token array state in the GasFeeController.
 */
export const stopGasPolling = () => {
  const { GasFeeController }: any = Engine.context;
  return GasFeeController.stopPolling();
};

export const useDataStore = () => {
  const [
    gasFeeEstimates,
    gasEstimateType,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    accounts,
    contractBalances,
    ticker,
    transaction,
    selectedAsset,
    showCustomNonce,
  ] = useSelector(
    (state: any) => [
      state.engine.backgroundState.GasFeeController.gasFeeEstimates,
      state.engine.backgroundState.GasFeeController.gasEstimateType,
      state.engine.backgroundState.TokenRatesController.contractExchangeRates,
      state.engine.backgroundState.CurrencyRateController.conversionRate,
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
      state.engine.backgroundState.CurrencyRateController.nativeCurrency,
      state.engine.backgroundState.AccountTrackerController.accounts,
      state.engine.backgroundState.TokenBalancesController.contractBalances,
      state.engine.backgroundState.NetworkController.provider.ticker,
      state.transaction,
      state.transaction.selectedAsset,
      state.settings.showCustomNonce,
    ],
    shallowEqual,
  );

  return {
    gasFeeEstimates,
    transactionState: transaction,
    gasEstimateType,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    accounts,
    contractBalances,
    selectedAsset,
    ticker,
    showCustomNonce,
  };
};

interface GetEIP1559TransactionDataProps {
  gas: {
    maxWaitTimeEstimate: number;
    minWaitTimeEstimate: number;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
    selectedOption: string | null;
  };
  gasFeeEstimates: {
    baseFeeTrend: string;
    estimatedBaseFee: string;
    high: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    historicalBaseFeeRange: string[];
    historicalPriorityFeeRange: string[];
    latestPriorityFeeRange: string[];
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
    networkCongestion: number;
    priorityFeeTrend: string;
  };

  transactionState: any;
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  nativeCurrency: string;
  suggestedGasLimit: string;
  onlyGas?: boolean;
}

interface LegacyProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  transactionState: any;
  ticker: string;
  suggestedGasPrice: any;
  suggestedGasLimit: string;
  onlyGas?: boolean;
}

interface UseGasTransactionProps {
  gasSelected: string | null;
  gasLimit: string;
  onlyGas?: boolean;
  legacy?: boolean;
  gasData: {
    estimatedBaseFee: string;
    estimatedBaseFeeHex: string;
    gasFeeMaxConversion: string;
    gasFeeMaxNative: string;
    gasFeeMinConversion: string;
    gasFeeMinNative: string;
    gasLimitHex: string;
    maxPriorityFeeConversion: string;
    maxPriorityFeeNative: string;
    renderableGasFeeMaxConversion: string;
    renderableGasFeeMaxNative: string;
    renderableGasFeeMinConversion: string;
    renderableGasFeeMinNative: string;
    renderableMaxFeePerGasConversion: string;
    renderableMaxFeePerGasNative: string;
    renderableMaxPriorityFeeConversion: string;
    renderableMaxPriorityFeeNative: string;
    suggestedEstimatedGasLimit: string | undefined;
    suggestedGasLimit: string;
    suggestedMaxFeePerGas: string;
    suggestedMaxFeePerGasHex: string;
    suggestedMaxPriorityFeePerGas: string;
    suggestedMaxPriorityFeePerGasHex: string;
    timeEstimate: string;
    timeEstimateColor: string;
    timeEstimateId: string;
    totalMaxHex: string;
  };
}

/**
 *
 * @param {GetEIP1559TransactionDataProps} props
 * @returns parsed transaction data for EIP1559 transactions.
 */
export const getEIP1559TransactionData = ({
  gas,
  gasFeeEstimates,
  transactionState,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  nativeCurrency,
  onlyGas,
}: GetEIP1559TransactionDataProps) => {
  try {
    if (
      !gas ||
      !gasFeeEstimates ||
      !transactionState ||
      !contractExchangeRates ||
      !conversionRate ||
      !currentCurrency ||
      !nativeCurrency
    ) {
      return 'Incomplete data for EIP1559 transaction';
    }

    const parsedTransactionEIP1559 = parseTransactionEIP1559(
      {
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        nativeCurrency,
        transactionState,
        gasFeeEstimates,
        swapsParams: undefined,
        selectedGasFee: {
          ...gas,
          estimatedBaseFee: gasFeeEstimates.estimatedBaseFee,
        },
      },
      { onlyGas },
    );

    return parsedTransactionEIP1559;
  } catch (error) {
    return 'Error parsing transaction data';
  }
};

/**
 *
 * @param {LegacyProps} props
 * @returns parsed transaction data for legacy transactions.
 */
export const getLegacyTransactionData = ({
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  transactionState,
  ticker,
  suggestedGasPrice,
  suggestedGasLimit,
  onlyGas,
}: LegacyProps) => {
  const parsedTransationData = parseTransactionLegacy(
    {
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      transactionState,
      ticker,
      selectedGasFee: {
        suggestedGasLimit,
        suggestedGasPrice,
      },
    },
    { onlyGas },
  );
  return parsedTransationData;
};

/**
 *
 * @returns {Object} the transaction data for the current transaction.
 */
export const useGasTransaction = ({
  onlyGas,
  gasSelected,
  legacy,
  gasLimit,
  gasData,
}: UseGasTransactionProps) => {
  const [gasEstimateTypeChange, updateGasEstimateTypeChange] =
    useState<string>('');

  const {
    gasFeeEstimates,
    transactionState,
    gasEstimateType,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    ticker,
  } = useDataStore();

  useEffect(() => {
    if (gasEstimateType !== gasEstimateTypeChange) {
      updateGasEstimateTypeChange(gasEstimateType);
    }
  }, [gasEstimateType, gasEstimateTypeChange]);

  const {
    transaction: { gas: transactionGas },
  } = transactionState;

  const suggestedGasLimit = gasLimit || fromWei(transactionGas, 'wei');

  if (legacy) {
    return getLegacyTransactionData({
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      transactionState,
      ticker,
      suggestedGasPrice:
        gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
          ? gasFeeEstimates[gasSelected]
          : gasFeeEstimates.gasPrice,
      suggestedGasLimit,
      onlyGas,
    });
  }

  return getEIP1559TransactionData({
    gas: {
      ...(gasSelected
        ? gasFeeEstimates[gasSelected]
        : {
            suggestedMaxFeePerGas: gasData?.suggestedMaxFeePerGas,
            suggestedMaxPriorityFeePerGas:
              gasData?.suggestedMaxPriorityFeePerGas,
          }),
      suggestedGasLimit,
      selectedOption: gasSelected,
    },
    gasFeeEstimates,
    transactionState,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    suggestedGasLimit,
    onlyGas,
  });
};
