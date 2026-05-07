import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PREDICT_CURRENCY } from '../../../../../../Views/confirmations/constants/predict';
import { useTransactionCustomAmount } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionMetadataRequest } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../../../../../../Views/confirmations/hooks/transactions/useUpdateTokenAmount';
import { usePredictPaymentToken } from '../../../../hooks/usePredictPaymentToken';
import { useTransactionPayToken } from '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { MINIMUM_BET } from '../../../../constants/transactions';
import { OrderPreview } from '../../../../types';
import { Hex } from '@metamask/utils';
import EngineService from '../../../../../../../core/EngineService';
import {
  getPredictExchangeFee,
  roundUpToCents,
} from '../../../../utils/orders';

interface PredictPayWithAnyTokenInfoProps {
  currentValue: number;
  preview?: OrderPreview | null;
  isInputFocused: boolean;
}

const PredictPayWithAnyTokenInfo = ({
  currentValue,
  preview,
  isInputFocused,
}: PredictPayWithAnyTokenInfoProps) => {
  const transactionMeta = useTransactionMetadataRequest();

  if (!transactionMeta) {
    return null;
  }

  return (
    <PredictPayWithAnyTokenInfoInner
      currentValue={currentValue}
      preview={preview}
      isInputFocused={isInputFocused}
    />
  );
};

function PredictPayWithAnyTokenInfoInner({
  currentValue,
  preview,
  isInputFocused,
}: PredictPayWithAnyTokenInfoProps) {
  const [depositAmount, setDepositAmount] = useState('');

  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const { setPayToken, payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();
  const { updatePendingAmount, amountHuman } = useTransactionCustomAmount({
    currency: PREDICT_CURRENCY,
  });
  const fees = preview?.fees;

  const totalPayForPredictBalance = useMemo(
    () =>
      roundUpToCents(
        currentValue + (fees?.metamaskFee ?? 0) + getPredictExchangeFee(fees),
      ),
    [currentValue, fees],
  );

  const canTriggerDepositAmountCalculation = useMemo(
    () =>
      !isPredictBalanceSelected &&
      !!fees &&
      currentValue >= MINIMUM_BET &&
      !isInputFocused,
    [isPredictBalanceSelected, fees, currentValue, isInputFocused],
  );

  const computedDepositAmount = useMemo(() => {
    if (!canTriggerDepositAmountCalculation) {
      return '';
    }

    return new BigNumber(totalPayForPredictBalance)
      .decimalPlaces(2, BigNumber.ROUND_UP)
      .toString(10);
  }, [canTriggerDepositAmountCalculation, totalPayForPredictBalance]);

  useEffect(() => {
    if (!canTriggerDepositAmountCalculation) return;
    setDepositAmount((prev) =>
      prev === computedDepositAmount ? prev : computedDepositAmount,
    );
  }, [canTriggerDepositAmountCalculation, computedDepositAmount]);

  const hasValidDepositAmount = useMemo(
    () => depositAmount !== '' && transactionMeta,
    [depositAmount, transactionMeta],
  );

  const lastEmittedDepositRef = useRef('');
  const lastEmittedAmountHumanRef = useRef('');

  useEffect(() => {
    if (
      !hasValidDepositAmount ||
      depositAmount === lastEmittedDepositRef.current
    ) {
      return;
    }
    lastEmittedDepositRef.current = depositAmount;
    updatePendingAmount(depositAmount);
    EngineService.flushState();
  }, [depositAmount, hasValidDepositAmount, updatePendingAmount]);

  useEffect(() => {
    if (
      !amountHuman ||
      amountHuman === '0' ||
      !hasValidDepositAmount ||
      amountHuman === lastEmittedAmountHumanRef.current
    ) {
      return;
    }
    lastEmittedAmountHumanRef.current = amountHuman;
    updateTokenAmountCallback(amountHuman);
    EngineService.flushState();
  }, [
    amountHuman,
    updateTokenAmountCallback,
    depositAmount,
    hasValidDepositAmount,
  ]);

  useEffect(() => {
    if (!transactionMeta || isPredictBalanceSelected || !selectedPaymentToken) {
      return;
    }

    const selectedTokenAddress = selectedPaymentToken.address?.toLowerCase();
    const selectedTokenChainId = selectedPaymentToken.chainId?.toLowerCase();

    if (!selectedTokenAddress || !selectedTokenChainId) {
      return;
    }

    const hasSelectedTokenApplied =
      payToken?.address?.toLowerCase() === selectedTokenAddress &&
      payToken?.chainId?.toLowerCase() === selectedTokenChainId;

    if (!hasSelectedTokenApplied) {
      setPayToken({
        address: selectedPaymentToken.address as Hex,
        chainId: selectedPaymentToken.chainId as Hex,
      });
      EngineService.flushState();
    }
  }, [
    transactionMeta,
    isPredictBalanceSelected,
    selectedPaymentToken,
    payToken?.address,
    payToken?.chainId,
    setPayToken,
  ]);

  return null;
}

export default PredictPayWithAnyTokenInfo;
