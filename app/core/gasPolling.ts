import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from './Engine';
import AppConstants from './AppConstants';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';

import { fromWei } from '../util/number';
import {
  parseTransactionEIP1559,
  parseTransactionLegacy,
} from '../util/transactions';

export const startGasPolling = async (token: undefined) => {
  const { GasFeeController }: any = Engine.context;
  const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(
    token,
  );
  return pollToken;
};

export const stopGasPolling = (token: string) => {
  const { GasFeeController }: any = Engine.context;
  return GasFeeController.stopPolling(token);
};

export const useDataStore = () => {
  const {
    engine: {
      backgroundState: {
        GasFeeController: { gasEstimateType, gasFeeEstimates },
        TokenRatesController: { contractExchangeRates },
        CurrencyRateController: {
          conversionRate,
          currentCurrency,
          nativeCurrency,
        },
        AccountTrackerController: { accounts },
        TokenBalancesController: { contractBalances },
      },
    },
    transaction,
  } = useSelector(
    (state: any) =>
      state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  );
  const selectedAsset = transaction.selectedAsset;

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
  };
};

interface GetEIP1559TransactionDataProps {
  gas: {
    maxWaitTimeEstimate: number;
    minWaitTimeEstimate: number;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };
  selectedOption: string;
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
}

interface LegacyProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: string;
  transactionState: any;
  ticker: string;
  suggestedGasPrice: any;
  suggestedGasLimit: any;
}

export const getEIP1559TransactionData = ({
  gas,
  selectedOption,
  gasFeeEstimates,
  transactionState,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  nativeCurrency,
  suggestedGasLimit,
}: GetEIP1559TransactionDataProps) => {
  const parsedTransactionEIP1559 = parseTransactionEIP1559({
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    transactionState,
    gasFeeEstimates,
    swapsParams: undefined,
    selectedGasFee: {
      ...gas,
      suggestedGasLimit,
      selectedOption,
      estimatedBaseFee: gasFeeEstimates.estimatedBaseFee,
    },
  });

  return parsedTransactionEIP1559;
};

export const getLegacyTransactionData = ({
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  transactionState,
  ticker,
  suggestedGasPrice,
  suggestedGasLimit,
}: LegacyProps) => {
  const parsedTransationData = parseTransactionLegacy({
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    transactionState,
    ticker,
    selectedGasFee: { suggestedGasLimit, suggestedGasPrice },
  });
  return parsedTransationData;
};

export const useGasFeeEstimates = () => {
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
  } = useDataStore();

  useEffect(() => {
    if (gasEstimateType !== gasEstimateTypeChange) {
      updateGasEstimateTypeChange(gasEstimateType);
    }
  }, [gasEstimateType, gasEstimateTypeChange]);

  const gasSelected = gasEstimateTypeChange
    ? AppConstants.GAS_OPTIONS.MEDIUM
    : AppConstants.GAS_OPTIONS.MEDIUM;

  const {
    transaction: { gas: transactionGas },
  } = transactionState;

  if (gasEstimateTypeChange) {
    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      const suggestedGasLimit = fromWei(transactionGas, 'wei');
      const EIP1559TransactionData = getEIP1559TransactionData({
        gas: gasFeeEstimates[gasSelected],
        selectedOption: gasSelected,
        gasFeeEstimates,
        transactionState,
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        nativeCurrency,
        suggestedGasLimit,
      });
      return EIP1559TransactionData;
    } else if (gasEstimateType !== GAS_ESTIMATE_TYPES.NONE) {
      const suggestedGasLimit = fromWei(transactionGas, 'wei');
      const LegacyTransactionData = getLegacyTransactionData({
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        transactionState,
        ticker: 'ETH',
        suggestedGasPrice:
          gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
            ? gasFeeEstimates[gasSelected]
            : gasFeeEstimates.gasPrice,
        suggestedGasLimit,
      });
      return LegacyTransactionData;
    }
  }

  return gasFeeEstimates;
};
