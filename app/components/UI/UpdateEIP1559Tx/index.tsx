/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import EditGasFee1559Update from '../EditGasFee1559Update';
import { connect } from 'react-redux';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/transaction-controller';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { hexToBN, fromWei, renderFromWei } from '../../../util/number';
import BigNumber from 'bignumber.js';
import { getTicker } from '../../../util/transactions';
import AppConstants from '../../../core/AppConstants';
import { strings } from '../../../../locales/i18n';
import {
  startGasPolling,
  stopGasPolling,
} from '../../../core/GasPolling/GasPolling';
import { GasTransactionProps } from '../../../core/GasPolling/types';
import { UpdateEIP1559Props, UpdateTx1559Options } from './types';

const UpdateEIP1559Tx = ({
  gas,
  accounts,
  selectedAddress,
  ticker,
  existingGas,
  gasFeeEstimates,
  gasEstimateType,
  primaryCurrency,
  isCancel,
  chainId,
  onCancel,
  onSave,
}: UpdateEIP1559Props) => {
  const [animateOnGasChange, setAnimateOnGasChange] = useState(false);
  const [gasSelected, setGasSelected] = useState(
    AppConstants.GAS_OPTIONS.MEDIUM,
  );
  const stopUpdateGas = useRef(false);
  /**
   * Flag to only display high gas selection option if the legacy is higher then low/med
   */
  const onlyDisplayHigh = useRef(false);
  /**
   * Options
   */
  const updateTx1559Options = useRef<UpdateTx1559Options | undefined>();
  const pollToken = useRef(undefined);
  const firstTime = useRef(true);

  const suggestedGasLimit = fromWei(gas, 'wei');

  useEffect(() => {
    if (animateOnGasChange) setAnimateOnGasChange(false);
  }, [animateOnGasChange]);

  useEffect(() => {
    const startGasEstimatePolling = async () => {
      pollToken.current = await startGasPolling(pollToken.current);
    };
    startGasEstimatePolling();

    return () => {
      stopGasPolling();
    };
  }, []);

  const isMaxFeePerGasMoreThanLegacy = useCallback(
    (maxFeePerGas: BigNumber) => {
      const newDecMaxFeePerGas = new BigNumber(existingGas.maxFeePerGas).times(
        new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE),
      );
      return {
        result: maxFeePerGas.gte(newDecMaxFeePerGas),
        value: newDecMaxFeePerGas,
      };
    },
    [existingGas.maxFeePerGas, isCancel],
  );

  const isMaxPriorityFeePerGasMoreThanLegacy = useCallback(
    (maxPriorityFeePerGas: BigNumber) => {
      const newDecMaxPriorityFeePerGas = new BigNumber(
        existingGas.maxPriorityFeePerGas,
      ).times(new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE));
      return {
        result: maxPriorityFeePerGas.gte(newDecMaxPriorityFeePerGas),
        value: newDecMaxPriorityFeePerGas,
      };
    },
    [existingGas.maxPriorityFeePerGas, isCancel],
  );

  const validateAmount = useCallback(
    (updateTx) => {
      let error;

      const updateTxCost: any = hexToBN(`0x${updateTx.totalMaxHex}`);
      const accountBalance: any = hexToBN(accounts[selectedAddress].balance);
      const isMaxFeePerGasMoreThanLegacyResult = isMaxFeePerGasMoreThanLegacy(
        new BigNumber(updateTx.suggestedMaxFeePerGas),
      );
      const isMaxPriorityFeePerGasMoreThanLegacyResult =
        isMaxPriorityFeePerGasMoreThanLegacy(
          new BigNumber(updateTx.suggestedMaxPriorityFeePerGas),
        );
      if (accountBalance.lt(updateTxCost)) {
        const amount = renderFromWei(updateTxCost.sub(accountBalance));
        const tokenSymbol = getTicker(ticker);
        error = strings('transaction.insufficient_amount', {
          amount,
          tokenSymbol,
        });
      } else if (!isMaxFeePerGasMoreThanLegacyResult.result) {
        error = isCancel
          ? strings('edit_gas_fee_eip1559.max_fee_cancel_low', {
              cancel_value: isMaxFeePerGasMoreThanLegacyResult.value,
            })
          : strings('edit_gas_fee_eip1559.max_fee_speed_up_low', {
              speed_up_floor_value: isMaxFeePerGasMoreThanLegacyResult.value,
            });
      } else if (!isMaxPriorityFeePerGasMoreThanLegacyResult.result) {
        error = isCancel
          ? strings('edit_gas_fee_eip1559.max_priority_fee_cancel_low', {
              cancel_value: isMaxPriorityFeePerGasMoreThanLegacyResult.value,
            })
          : strings('edit_gas_fee_eip1559.max_priority_fee_speed_up_low', {
              speed_up_floor_value:
                isMaxPriorityFeePerGasMoreThanLegacyResult.value,
            });
      }

      return error;
    },
    [
      accounts,
      selectedAddress,
      isMaxFeePerGasMoreThanLegacy,
      isMaxPriorityFeePerGasMoreThanLegacy,
      ticker,
      isCancel,
    ],
  );

  useEffect(() => {
    if (stopUpdateGas.current) return;
    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      if (firstTime.current) {
        const newDecMaxFeePerGas = new BigNumber(
          existingGas.maxFeePerGas,
        ).times(new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE));
        const newDecMaxPriorityFeePerGas = new BigNumber(
          existingGas.maxPriorityFeePerGas,
        ).times(new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE));

        //Check to see if default SPEED_UP_RATE/CANCEL_RATE is greater than current market medium value
        if (
          !isMaxFeePerGasMoreThanLegacy(
            new BigNumber(gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas),
          ).result ||
          !isMaxPriorityFeePerGasMoreThanLegacy(
            new BigNumber(gasFeeEstimates.medium.suggestedMaxFeePerGas),
          ).result
        ) {
          updateTx1559Options.current = {
            maxPriortyFeeThreshold: newDecMaxPriorityFeePerGas,
            maxFeeThreshold: newDecMaxFeePerGas,
            showAdvanced: true,
            isCancel,
          };

          onlyDisplayHigh.current = true;
          //Disable polling
          stopUpdateGas.current = true;
          setGasSelected('');
        } else {
          updateTx1559Options.current = {
            maxPriortyFeeThreshold:
              gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas,
            maxFeeThreshold: gasFeeEstimates.medium.suggestedMaxFeePerGas,
            showAdvanced: false,
            isCancel,
          };
          setAnimateOnGasChange(true);
        }
      }

      firstTime.current = false;
    }
  }, [
    existingGas.maxFeePerGas,
    existingGas.maxPriorityFeePerGas,
    gasEstimateType,
    gasFeeEstimates,
    gasSelected,
    isCancel,
    gas,
    suggestedGasLimit,
    isMaxFeePerGasMoreThanLegacy,
    isMaxPriorityFeePerGasMoreThanLegacy,
  ]);

  const update1559TempGasValue = (selected: string) => {
    stopUpdateGas.current = !selected;
    setGasSelected(selected);
  };

  const onSaveTxnWithError = (gasTxn: GasTransactionProps) => {
    gasTxn.error = validateAmount(gasTxn);
    onSave(gasTxn);
  };

  const getGasAnalyticsParams = () => ({
    chain_id: chainId,
    gas_estimate_type: gasEstimateType,
    gas_mode: gasSelected ? 'Basic' : 'Advanced',
    speed_set: gasSelected || undefined,
    view: isCancel ? AppConstants.CANCEL_RATE : AppConstants.SPEED_UP_RATE,
  });

  const selectedGasObject = {
    suggestedMaxFeePerGas: existingGas.maxFeePerGas,
    suggestedMaxPriorityFeePerGas: existingGas.maxPriorityFeePerGas,
    suggestedGasLimit,
  };
  return (
    <EditGasFee1559Update
      selectedGasValue={gasSelected}
      gasOptions={gasFeeEstimates}
      primaryCurrency={primaryCurrency}
      chainId={chainId}
      onChange={update1559TempGasValue}
      onCancel={onCancel}
      onSave={onSaveTxnWithError}
      ignoreOptions={
        onlyDisplayHigh.current
          ? [AppConstants.GAS_OPTIONS.LOW, AppConstants.GAS_OPTIONS.MEDIUM]
          : [AppConstants.GAS_OPTIONS.LOW]
      }
      updateOption={updateTx1559Options.current}
      analyticsParams={getGasAnalyticsParams()}
      animateOnChange={animateOnGasChange}
      selectedGasObject={selectedGasObject}
      onlyGas
    />
  );
};

const mapStateToProps = (state: any) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  gasFeeEstimates:
    state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  gasEstimateType:
    state.engine.backgroundState.GasFeeController.gasEstimateType,
  primaryCurrency: state.settings.primaryCurrency,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

export default connect(mapStateToProps)(UpdateEIP1559Tx);
