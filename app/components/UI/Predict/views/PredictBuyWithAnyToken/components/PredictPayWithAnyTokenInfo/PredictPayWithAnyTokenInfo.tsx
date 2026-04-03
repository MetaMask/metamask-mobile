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
    if (!preview?.fees || currentValue < MINIMUM_BET) {
      return 0;
    }

    const remainingAmount = new BigNumber(totalPayForPredictBalance)
      .minus(predictBalance)
      .decimalPlaces(2, BigNumber.ROUND_UP)
      .toNumber();
    if (remainingAmount <= 0) {
      return new BigNumber(totalPayForPredictBalance)
        .decimalPlaces(2, BigNumber.ROUND_UP)
        .toNumber();
    }
    return remainingAmount;
  }, [preview?.fees, currentValue, totalPayForPredictBalance, predictBalance]);

  const parsedDepositAmount = useMemo(() => {
    if (isPredictBalanceSelected || depositAmount <= 0) {
      return '';
    }
    return new BigNumber(depositAmount)
      .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
      .toString(10);
  }, [isPredictBalanceSelected, depositAmount]);

  const { updatePendingAmount, amountHuman } = useTransactionCustomAmount({
    currency: PREDICT_CURRENCY,
  });

  useEffect(() => {
    if (
      parsedDepositAmount &&
      parsedDepositAmount.trim() !== '' &&
      transactionMeta
    ) {
      updatePendingAmount(parsedDepositAmount);
    }
  }, [parsedDepositAmount, transactionMeta, updatePendingAmount]);

  useEffect(() => {
    if (
      amountHuman &&
      amountHuman !== '0' &&
      parsedDepositAmount &&
      parsedDepositAmount.trim() !== '' &&
      transactionMeta
    ) {
      updateTokenAmountCallback(parsedDepositAmount);
    }
  }, [
    amountHuman,
    transactionMeta,
    updateTokenAmountCallback,
    parsedDepositAmount,
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
