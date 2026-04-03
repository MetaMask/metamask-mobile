import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo } from 'react';
import { PREDICT_CURRENCY } from '../../../../../../Views/confirmations/constants/predict';
import { useTransactionCustomAmount } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionMetadataRequest } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../../../../../../Views/confirmations/hooks/transactions/useUpdateTokenAmount';
import { usePredictPaymentToken } from '../../../../hooks/usePredictPaymentToken';
import { usePredictBalance } from '../../../../hooks/usePredictBalance';
import { useTransactionPayToken } from '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { MINIMUM_BET } from '../../../../constants/transactions';
import { OrderPreview } from '../../../../types';
import { Hex } from '@metamask/utils';

interface PredictPayWithAnyTokenInfoProps {
  currentValue: number;
  preview?: OrderPreview | null;
}

const PredictPayWithAnyTokenInfo = ({
  currentValue,
  preview,
}: PredictPayWithAnyTokenInfoProps) => {
  const transactionMeta = useTransactionMetadataRequest();

  if (!transactionMeta) {
    return null;
  }

  return (
    <PredictPayWithAnyTokenInfoInner
      currentValue={currentValue}
      preview={preview}
    />
  );
};

function PredictPayWithAnyTokenInfoInner({
  currentValue,
  preview,
}: PredictPayWithAnyTokenInfoProps) {
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const { setPayToken, payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const { data: predictBalance = 0 } = usePredictBalance();

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  const totalPayForPredictBalance = useMemo(
    () =>
      currentValue +
      (preview?.fees?.providerFee ?? 0) +
      (preview?.fees?.metamaskFee ?? 0),
    [currentValue, preview?.fees?.providerFee, preview?.fees?.metamaskFee],
  );

  const depositAmount = useMemo(() => {
    if (
      isPredictBalanceSelected ||
      !preview?.fees ||
      currentValue < MINIMUM_BET
    ) {
      return '';
    }

    const totalPay = new BigNumber(totalPayForPredictBalance);
    const remaining = totalPay.minus(predictBalance);

    const amount = remaining.lte(0)
      ? totalPay.decimalPlaces(2, BigNumber.ROUND_UP)
      : remaining.decimalPlaces(2, BigNumber.ROUND_UP);

    const parsedDepositAmount = amount.toString(10);

    return parsedDepositAmount;
  }, [
    isPredictBalanceSelected,
    preview?.fees,
    currentValue,
    totalPayForPredictBalance,
    predictBalance,
  ]);

  const hasValidDepositAmount = useMemo(
    () => depositAmount && depositAmount.trim() !== '' && transactionMeta,
    [depositAmount, transactionMeta],
  );

  const { updatePendingAmount, amountHuman } = useTransactionCustomAmount({
    currency: PREDICT_CURRENCY,
  });

  useEffect(() => {
    if (hasValidDepositAmount) {
      updatePendingAmount(depositAmount);
    }
  }, [depositAmount, hasValidDepositAmount, updatePendingAmount]);

  useEffect(() => {
    if (amountHuman && amountHuman !== '0' && hasValidDepositAmount) {
      updateTokenAmountCallback(amountHuman);
    }
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

    const hasSelectedTokenApplied =
      payToken?.address?.toLowerCase() ===
        selectedPaymentToken.address.toLowerCase() &&
      payToken?.chainId?.toLowerCase() ===
        selectedPaymentToken.chainId.toLowerCase();

    if (!hasSelectedTokenApplied) {
      setPayToken({
        address: selectedPaymentToken.address as Hex,
        chainId: selectedPaymentToken.chainId as Hex,
      });
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
