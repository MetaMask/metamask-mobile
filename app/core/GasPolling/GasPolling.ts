import { useEffect, useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';

import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';

import { selectAccounts } from '../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../selectors/currencyRateController';
import { selectTicker } from '../../selectors/networkController';
import { selectContractBalances } from '../../selectors/tokenBalancesController';
import { selectContractExchangeRates } from '../../selectors/tokenRatesController';
import { fromWei, isBN, toGwei } from '../../util/number';
import {
  parseTransactionEIP1559,
  parseTransactionLegacy,
} from '../../util/transactions';
import Engine from '../Engine';
import {
  GetEIP1559TransactionDataProps,
  LegacyProps,
  UseGasTransactionProps,
} from './types';
import { selectGasFeeEstimates } from '../../selectors/confirmTransaction';

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
    accounts,
    contractBalances,
    ticker,
    transaction,
    selectedAsset,
    showCustomNonce,
  ] = useSelector(
    (state: any) => [
      selectGasFeeEstimates(state),
      state.engine.backgroundState.GasFeeController.gasEstimateType,
      selectContractExchangeRates(state),
      selectConversionRate(state),
      selectCurrentCurrency(state),
      selectAccounts(state),
      selectContractBalances(state),
      selectTicker(state),
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
    accounts,
    contractBalances,
    selectedAsset,
    ticker,
    showCustomNonce,
  };
};

/**
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
        transactionState: {
          selectedAsset: transactionState.selectedAsset,
          transaction: {
            value: transactionState.transaction.value,
            data: transactionState.transaction.data,
          },
        },
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
  gas,
  onlyGas,
  multiLayerL1FeeTotal,
}: LegacyProps) => {
  const parsedTransactionData = parseTransactionLegacy(
    {
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      transactionState,
      ticker,
      selectedGasFee: {
        ...gas,
      },
      multiLayerL1FeeTotal,
    },
    { onlyGas },
  );

  return parsedTransactionData;
};

/**
 *
 * @returns {Object} the transaction data for the current transaction.
 */
export const useGasTransaction = ({
  onlyGas,
  gasSelected,
  legacy,
  gasObject,
  gasObjectLegacy,
  multiLayerL1FeeTotal,
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
    ticker,
  } = useDataStore();

  useEffect(() => {
    if (gasEstimateType !== gasEstimateTypeChange) {
      updateGasEstimateTypeChange(gasEstimateType);
    }
  }, [gasEstimateType, gasEstimateTypeChange]);

  const {
    transaction: { gas: transactionGas, gasPrice },
  } = transactionState;

  const suggestedGasLimit =
    gasObject?.suggestedGasLimit || fromWei(transactionGas, 'wei');

  let suggestedGasPrice;

  if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
    suggestedGasPrice = gasObjectLegacy?.suggestedGasPrice;
  } else {
    suggestedGasPrice = gasFeeEstimates?.gasPrice || gasFeeEstimates?.low;
  }

  if (gasEstimateType !== GAS_ESTIMATE_TYPES.FEE_MARKET) {
    if (isBN(gasPrice)) {
      suggestedGasPrice =
        gasObjectLegacy?.suggestedGasPrice || toGwei(gasPrice).toString();
    } else {
      suggestedGasPrice =
        gasObjectLegacy?.suggestedGasPrice || gasFeeEstimates?.gasPrice;
    }
  }

  if (legacy) {
    return getLegacyTransactionData({
      gas: {
        suggestedGasLimit: gasObjectLegacy?.legacyGasLimit || suggestedGasLimit,
        suggestedGasPrice,
      },
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      transactionState,
      ticker,
      onlyGas,
      multiLayerL1FeeTotal,
    });
  }

  return getEIP1559TransactionData({
    gas: {
      ...(gasSelected
        ? gasFeeEstimates[gasSelected]
        : {
            suggestedMaxFeePerGas: gasObject?.suggestedMaxFeePerGas,
            suggestedMaxPriorityFeePerGas:
              gasObject?.suggestedMaxPriorityFeePerGas,
          }),
      suggestedGasLimit,
      selectedOption: gasSelected,
    },
    gasFeeEstimates,
    transactionState,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency: ticker,
    suggestedGasLimit,
    onlyGas,
  });
};
