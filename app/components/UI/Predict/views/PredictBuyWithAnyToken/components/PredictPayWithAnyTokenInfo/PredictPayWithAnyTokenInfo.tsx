import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo } from 'react';
import { PREDICT_CURRENCY } from '../../../../../../Views/confirmations/constants/predict';
import { useTransactionCustomAmount } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionMetadataRequest } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../../../../../../Views/confirmations/hooks/transactions/useUpdateTokenAmount';
import { usePredictPaymentToken } from '../../../../hooks/usePredictPaymentToken';
import { useTransactionPayToken } from '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { Hex } from '@metamask/utils';

interface PredictPayWithAnyTokenInfoProps {
  depositAmount: number;
}

const PredictPayWithAnyTokenInfo = ({
  depositAmount,
}: PredictPayWithAnyTokenInfoProps) => {
  const transactionMeta = useTransactionMetadataRequest();

  if (!transactionMeta) {
    return null;
  }

  return <PredictPayWithAnyTokenInfoInner depositAmount={depositAmount} />;
};

function PredictPayWithAnyTokenInfoInner({
  depositAmount,
}: PredictPayWithAnyTokenInfoProps) {
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const { setPayToken, payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

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
