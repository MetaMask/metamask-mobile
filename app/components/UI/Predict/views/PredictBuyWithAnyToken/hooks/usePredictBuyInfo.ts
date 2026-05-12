import { BigNumber } from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { useTransactionPayTotals } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview } from '../../../types';
import { useInsufficientPayTokenBalanceAlert } from '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert';
import { useNoPayTokenQuotesAlert } from '../../../../../Views/confirmations/hooks/alerts/useNoPayTokenQuotesAlert';

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

  const insufficientPayAlerts = useInsufficientPayTokenBalanceAlert();
  const noQuotesAlerts = useNoPayTokenQuotesAlert();

  const blockingPayAlerts = useMemo(() => {
    const allPayAlerts = [...insufficientPayAlerts, ...noQuotesAlerts];
    return allPayAlerts.filter((a) => a.isBlocking);
  }, [insufficientPayAlerts, noQuotesAlerts]);

  const hasBlockingPayAlerts =
    !isPredictBalanceSelected && blockingPayAlerts.length > 0;

  const blockingPayAlertMessage = useMemo(
    () => blockingPayAlerts[0]?.message ?? blockingPayAlerts[0]?.title,
    [blockingPayAlerts],
  );

  const [acceptedDepositFee, setAcceptedDepositFee] = useState(0);

  const totalPayForPredictBalance = useMemo(
    () =>
      currentValue +
      (preview?.fees?.providerFee ?? 0) +
      (preview?.fees?.metamaskFee ?? 0),
    [currentValue, preview?.fees?.providerFee, preview?.fees?.metamaskFee],
  );

  const computedDepositFee = useMemo(() => {
    if (isPredictBalanceSelected || !payTotals?.fees || hasBlockingPayAlerts)
      return 0;
    const { provider, sourceNetwork, targetNetwork } = payTotals.fees;
    return new BigNumber(provider?.usd ?? 0)
      .plus(sourceNetwork?.estimate?.usd ?? 0)
      .plus(targetNetwork?.usd ?? 0)
      .toNumber();
  }, [isPredictBalanceSelected, payTotals?.fees, hasBlockingPayAlerts]);

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

  return {
    toWin,
    metamaskFee,
    providerFee,
    depositFee,
    total,
    rewardsFeeAmount,
    totalPayForPredictBalance,
    blockingPayAlertMessage,
    hasBlockingPayAlerts,
  };
};
