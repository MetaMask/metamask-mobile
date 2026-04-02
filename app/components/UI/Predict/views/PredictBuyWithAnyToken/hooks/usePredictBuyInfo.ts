import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { useTransactionPayTotals } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview } from '../../../types';
import { useInsufficientPayTokenBalanceAlert } from '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert';
import { MINIMUM_BET } from '../../PredictBuyPreview/PredictBuyPreview';

interface UsePredictBuyInfoParams {
  currentValue: number;
  preview?: OrderPreview | null;
  previewError: string | null;
  isConfirming: boolean;
  isPlacingOrder: boolean;
}

export const usePredictBuyInfo = ({
  preview,
  previewError,
  currentValue,
  isConfirming,
  isPlacingOrder,
}: UsePredictBuyInfoParams) => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const payTotals = useTransactionPayTotals();
  const { data: predictBalance = 0 } = usePredictBalance();

  const [insufficientPayTokenBalanceAlert] =
    useInsufficientPayTokenBalanceAlert();

  const [acceptedDepositFee, setAcceptedDepositFee] = useState(0);

  const totalPayForPredictBalance = useMemo(
    () =>
      currentValue +
      (preview?.fees?.providerFee ?? 0) +
      (preview?.fees?.metamaskFee ?? 0),
    [currentValue, preview?.fees?.providerFee, preview?.fees?.metamaskFee],
  );

  const computedDepositFee = useMemo(() => {
    if (
      isPredictBalanceSelected ||
      !payTotals?.fees ||
      insufficientPayTokenBalanceAlert
    )
      return 0;
    const { provider, sourceNetwork, targetNetwork } = payTotals.fees;
    return new BigNumber(provider?.usd ?? 0)
      .plus(sourceNetwork?.estimate?.usd ?? 0)
      .plus(targetNetwork?.usd ?? 0)
      .toNumber();
  }, [
    insufficientPayTokenBalanceAlert,
    isPredictBalanceSelected,
    payTotals?.fees,
  ]);

  useEffect(() => {
    if (computedDepositFee > 0) {
      setAcceptedDepositFee(computedDepositFee);
    }
  }, [computedDepositFee]);

  useEffect(() => {
    if (!isConfirming) {
      setAcceptedDepositFee(0);
    }
  }, [isConfirming]);

  const fallbackDepositFee = isConfirming ? acceptedDepositFee : 0;
  const depositFee =
    computedDepositFee > 0 ? computedDepositFee : fallbackDepositFee;

  const rewardsFeeAmount =
    isPlacingOrder || previewError ? undefined : (preview?.fees?.totalFee ?? 0);

  const { toWin, metamaskFee, providerFee, total } = useMemo(
    () => ({
      toWin: preview?.minAmountReceived ?? 0,
      isRateLimited: preview?.rateLimited ?? false,
      metamaskFee: preview?.fees?.metamaskFee ?? 0,
      providerFee: preview?.fees?.providerFee ?? 0,
      total: totalPayForPredictBalance + depositFee,
    }),
    [
      depositFee,
      preview?.fees?.metamaskFee,
      preview?.fees?.providerFee,
      preview?.minAmountReceived,
      preview?.rateLimited,
      totalPayForPredictBalance,
    ],
  );

  const depositAmount = useMemo(() => {
    // Only trigger deposit amount calculation when preview fees are available and current value is greater than minimum bet
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

  return {
    toWin,
    metamaskFee,
    providerFee,
    depositFee,
    depositAmount,
    total,
    rewardsFeeAmount,
    totalPayForPredictBalance,
  };
};
