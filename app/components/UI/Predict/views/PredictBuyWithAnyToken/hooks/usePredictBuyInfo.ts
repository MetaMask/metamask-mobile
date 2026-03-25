import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { useTransactionPayTotals } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview } from '../../../types';

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

  const [acceptedDepositFee, setAcceptedDepositFee] = useState(0);

  const computedDepositFee = useMemo(() => {
    if (isPredictBalanceSelected || !payTotals?.fees) return 0;
    const { provider, sourceNetwork, targetNetwork } = payTotals.fees;
    return new BigNumber(provider?.usd ?? 0)
      .plus(sourceNetwork?.estimate?.usd ?? 0)
      .plus(targetNetwork?.usd ?? 0)
      .toNumber();
  }, [isPredictBalanceSelected, payTotals]);

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
      total:
        currentValue +
        (preview?.fees?.providerFee ?? 0) +
        (preview?.fees?.metamaskFee ?? 0) +
        depositFee,
    }),
    [
      currentValue,
      depositFee,
      preview?.fees?.metamaskFee,
      preview?.fees?.providerFee,
      preview?.minAmountReceived,
      preview?.rateLimited,
    ],
  );

  const depositAmount = useMemo(() => {
    const previewTotal =
      (preview?.maxAmountSpent ?? 0) + (preview?.fees?.totalFee ?? 0);
    const remainingAmount = Math.max(
      0,
      Math.ceil((previewTotal - predictBalance) * 100) / 100,
    );
    if (remainingAmount <= 0) {
      return previewTotal;
    }
    return remainingAmount;
  }, [preview, predictBalance]);

  return {
    toWin,
    metamaskFee,
    providerFee,
    depositFee,
    depositAmount,
    total,
    rewardsFeeAmount,
  };
};
