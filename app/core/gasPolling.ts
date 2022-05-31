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
  const gasFeeEstimates = useSelector(
    (state: any) =>
      state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  );
  const transactionState = useSelector((state: any) => state.transaction);
  const gasEstimateType = useSelector(
    (state: any) =>
      state.engine.backgroundState.GasFeeController.gasEstimateType,
  );
  const contractExchangeRates = useSelector(
    (state: any) =>
      state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  );
  const conversionRate = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.conversionRate,
  );
  const currentCurrency = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
  );
  const nativeCurrency = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.nativeCurrency,
  );
  return {
    gasFeeEstimates,
    transactionState,
    gasEstimateType,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
  };
};

interface GetEIP1559TransactionDataProps {
  transactionGas: string;
  gas: {
    maxWaitTimeEstimate: number;
    minWaitTimeEstimate: number;
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };
  selectedOption: string;
  gasFeeEstimates: any;
  transactionState: any;
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: 'usd' | string;
  nativeCurrency: string;
}

interface LegacyProps {
  contractExchangeRates: any;
  conversionRate: number;
  currentCurrency: 'usd' | string;
  transactionState: any;
  ticker: 'ETH';
  suggestedGasPrice: any;
  suggestedGasLimit: any;
}

export const getEIP1559TransactionData = ({
  transactionGas,
  gas,
  selectedOption,
  gasFeeEstimates,
  transactionState,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  nativeCurrency,
}: GetEIP1559TransactionDataProps) => {
  const suggestedGasLimit = fromWei(transactionGas, 'wei');
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
  const [gasEstimateTypeChange, updateGasEstimateTypeChange] = useState('');

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
      const EIP1559TransactionData = getEIP1559TransactionData({
        transactionGas,
        gas: gasFeeEstimates[gasSelected],
        selectedOption: gasSelected,
        gasFeeEstimates,
        transactionState,
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        nativeCurrency,
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
