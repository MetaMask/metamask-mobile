import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from './Engine';
import AppConstants from './AppConstants';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';

import { fromWei } from '../util/number';
import { parseTransactionEIP1559 } from '../util/transactions';

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

export const getGasFeeEstimates = () => {
  const [gasEstimateTypeChange, updateGasEstimateTypeChange] = useState('');
  const [stopUpdateGas, updateStopUpdateGas] = useState(false);
  const [advancedGasInserted, updateAdvancedGasInserted] = useState(false);

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

  useEffect(() => {
    if (gasEstimateType !== gasEstimateTypeChange) {
      updateGasEstimateTypeChange(gasEstimateType);
    }
  }, [gasEstimateType]);

  enum SelectedOptions {
    low = 'low',
    medium = 'medium',
    high = 'high',
  }

  interface GasFee {
    maxWaitTimeEstimate: number;
    minWaitTimeEstimate: number;
    selectedOption: SelectedOptions;
    suggestedGasLimit: number;
    suggestedMaxFeePerGas: number;
    suggestedMaxPriorityFeePerGas: number;
  }

  const parseTransactionDataEIP1559 = (gasFee: GasFee) => {
    const parsedTransactionEIP1559 = parseTransactionEIP1559({
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      nativeCurrency,
      transactionState,
      gasFeeEstimates,
      swapsParams: undefined,
      selectedGasFee: {
        ...gasFee,
        estimatedBaseFee: gasFeeEstimates.estimatedBaseFee,
      },
    });
    const { transaction } = transactionState;

    // TODO: rewrite this
    // parsedTransactionEIP1559.error = this.validateAmount({
    //   transaction,
    //   total: parsedTransactionEIP1559.totalMaxHex,
    // });

    return parsedTransactionEIP1559;
  };

  const gasSelected = gasEstimateTypeChange
    ? AppConstants.GAS_OPTIONS.MEDIUM
    : AppConstants.GAS_OPTIONS.MEDIUM;

  const gasSelectedTemp = gasEstimateTypeChange
    ? AppConstants.GAS_OPTIONS.MEDIUM
    : AppConstants.GAS_OPTIONS.MEDIUM;

  if ((!stopUpdateGas && !advancedGasInserted) || gasEstimateTypeChange) {
    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      const {
        transaction: { gas },
      } = transactionState;
      const suggestedGasLimit = fromWei(gas, 'wei');
      const EIP1559TransactionData = parseTransactionDataEIP1559({
        ...gasFeeEstimates[gasSelected],
        suggestedGasLimit,
        selectedOption: gasSelected,
      });

      let EIP1559TransactionDataTemp;
      if (gasSelected === gasSelectedTemp) {
        EIP1559TransactionDataTemp = EIP1559TransactionData;
      } else {
        EIP1559TransactionDataTemp = parseTransactionDataEIP1559({
          ...gasFeeEstimates[gasSelectedTemp],
          suggestedGasLimit,
          selectedOption: gasSelectedTemp,
        });
      }

      const {
        renderableTotalMinNative,
        renderableTotalMinConversion,
        renderableTotalMaxNative,
        renderableGasFeeMinNative,
        renderableGasFeeMinConversion,
        renderableGasFeeMaxNative,
        renderableGasFeeMaxConversion,
        timeEstimate,
        timeEstimateColor,
        timeEstimateId,
        error,
      } = EIP1559TransactionData;

      return {
        renderableTotalMinNative,
        renderableTotalMinConversion,
        renderableTotalMaxNative,
        renderableGasFeeMinNative,
        renderableGasFeeMinConversion,
        renderableGasFeeMaxNative,
        renderableGasFeeMaxConversion,
        timeEstimate,
        timeEstimateColor,
        timeEstimateId,
        error,
      };
    }
  }

  return gasFeeEstimates;
};
