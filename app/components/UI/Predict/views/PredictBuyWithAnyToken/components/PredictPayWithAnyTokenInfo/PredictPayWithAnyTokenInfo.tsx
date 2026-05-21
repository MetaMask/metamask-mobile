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
import { getPredictBuyAllInCost } from '../../../../utils/orders';

interface PredictPayWithAnyTokenInfoProps {
  currentValue: number;
  preview?: OrderPreview | null;
  /**
   * When true, defers the mm_pay relay-config side effects
   * (`updatePendingAmount` / `setPayToken`). The legacy full-screen flow
   * sets this while the keypad is open and only releases it on Done so the
   * relay isn't reconfigured on every keystroke. The bottom-sheet flow
   * keeps it false because there is no Done affordance and the user can
   * tap Confirm while the keypad is still open.
   */
  shouldDeferRelaySetup: boolean;
}

const PredictPayWithAnyTokenInfo = ({
  currentValue,
  preview,
  shouldDeferRelaySetup,
}: PredictPayWithAnyTokenInfoProps) => {
  const transactionMeta = useTransactionMetadataRequest();

  if (!transactionMeta) {
    return null;
  }

  return (
    <PredictPayWithAnyTokenInfoInner
      currentValue={currentValue}
      preview={preview}
      shouldDeferRelaySetup={shouldDeferRelaySetup}
    />
  );
};

function PredictPayWithAnyTokenInfoInner({
  currentValue,
  preview,
  shouldDeferRelaySetup,
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
    () => getPredictBuyAllInCost(preview),
    [preview],
  );

  const canTriggerDepositAmountCalculation = useMemo(
    () =>
      !isPredictBalanceSelected &&
      !!fees &&
      currentValue >= MINIMUM_BET &&
      !shouldDeferRelaySetup,
    [isPredictBalanceSelected, fees, currentValue, shouldDeferRelaySetup],
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
    () =>
      !isPredictBalanceSelected &&
      depositAmount !== '' &&
      Boolean(transactionMeta),
    [depositAmount, isPredictBalanceSelected, transactionMeta],
  );

  const emissionKey = useMemo(() => {
    const selectedTokenAddress =
      selectedPaymentToken?.address?.toLowerCase() ?? '';
    const selectedTokenChainId =
      selectedPaymentToken?.chainId?.toLowerCase() ?? '';

    return `${transactionMeta?.id ?? ''}:${selectedTokenAddress}:${selectedTokenChainId}`;
  }, [
    selectedPaymentToken?.address,
    selectedPaymentToken?.chainId,
    transactionMeta?.id,
  ]);

  const lastEmittedDepositRef = useRef({ key: '', value: '' });
  const lastEmittedAmountHumanRef = useRef({ key: '', value: '' });

  useEffect(() => {
    const lastEmittedDeposit = lastEmittedDepositRef.current;

    if (
      !hasValidDepositAmount ||
      (depositAmount === lastEmittedDeposit.value &&
        emissionKey === lastEmittedDeposit.key)
    ) {
      return;
    }
    lastEmittedDepositRef.current = {
      key: emissionKey,
      value: depositAmount,
    };
    updatePendingAmount(depositAmount);
    EngineService.flushState();
  }, [depositAmount, emissionKey, hasValidDepositAmount, updatePendingAmount]);

  useEffect(() => {
    const lastEmittedAmountHuman = lastEmittedAmountHumanRef.current;

    if (
      !amountHuman ||
      amountHuman === '0' ||
      !hasValidDepositAmount ||
      (amountHuman === lastEmittedAmountHuman.value &&
        emissionKey === lastEmittedAmountHuman.key)
    ) {
      return;
    }
    lastEmittedAmountHumanRef.current = {
      key: emissionKey,
      value: amountHuman,
    };
    updateTokenAmountCallback(amountHuman);
    EngineService.flushState();
  }, [
    amountHuman,
    emissionKey,
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
