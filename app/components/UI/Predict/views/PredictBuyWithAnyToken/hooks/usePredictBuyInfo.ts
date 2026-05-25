import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionPayTotals } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview } from '../../../types';
import { useInsufficientPayTokenBalanceAlert } from '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert';
import { useNoPayTokenQuotesAlert } from '../../../../../Views/confirmations/hooks/alerts/useNoPayTokenQuotesAlert';
import { AlertKeys } from '../../../../../Views/confirmations/constants/alerts';
import { Severity } from '../../../../../Views/confirmations/types/alerts';
import { RowAlertKey } from '../../../../../Views/confirmations/components/UI/info-row/alert-row/constants';
import { useHasInsufficientBalance } from '../../../../../Views/confirmations/hooks/useHasInsufficientBalance';
import {
  getPredictBuyAllInCost,
  getPredictExchangeFee,
} from '../../../utils/orders';

interface UsePredictBuyInfoParams {
  preview?: OrderPreview | null;
  previewError: string | null;
  isConfirming: boolean;
  isPlacingOrder: boolean;
}

export const usePredictBuyInfo = ({
  preview,
  previewError,
  isConfirming,
  isPlacingOrder,
}: UsePredictBuyInfoParams) => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const payTotals = useTransactionPayTotals();
  const fees = preview?.fees;

  const insufficientPayAlerts = useInsufficientPayTokenBalanceAlert();
  const noQuotesAlerts = useNoPayTokenQuotesAlert();
  const { hasInsufficientBalance, nativeCurrency } =
    useHasInsufficientBalance();
  const insufficientNativeBalanceAlerts = useMemo(() => {
    if (!hasInsufficientBalance) {
      return [];
    }

    return [
      {
        field: RowAlertKey.EstimatedFee,
        isBlocking: true,
        key: AlertKeys.InsufficientBalance,
        message: strings('alert_system.insufficient_balance.message', {
          nativeCurrency,
        }),
        severity: Severity.Danger,
        title: strings('alert_system.insufficient_balance.title'),
      },
    ];
  }, [hasInsufficientBalance, nativeCurrency]);

  const blockingPayAlerts = useMemo(() => {
    const allPayAlerts = [
      ...insufficientPayAlerts,
      ...noQuotesAlerts,
      ...insufficientNativeBalanceAlerts,
    ];
    return allPayAlerts.filter((a) => a.isBlocking);
  }, [insufficientNativeBalanceAlerts, insufficientPayAlerts, noQuotesAlerts]);

  const hasBlockingPayAlerts =
    !isPredictBalanceSelected && blockingPayAlerts.length > 0;

  const blockingPayAlertMessage = useMemo(
    () => blockingPayAlerts[0]?.message ?? blockingPayAlerts[0]?.title,
    [blockingPayAlerts],
  );

  const totalPayForPredictBalance = useMemo(
    () => getPredictBuyAllInCost(preview),
    [preview],
  );

  const depositFee = useMemo(() => {
    if (isPredictBalanceSelected || !payTotals?.fees) return 0;
    const { provider, sourceNetwork, targetNetwork } = payTotals.fees;
    return new BigNumber(provider?.usd ?? 0)
      .plus(sourceNetwork?.estimate?.usd ?? 0)
      .plus(targetNetwork?.usd ?? 0)
      .toNumber();
  }, [isPredictBalanceSelected, payTotals?.fees]);

  const rewardsFeeAmount =
    isPlacingOrder || previewError ? undefined : (fees?.totalFee ?? 0);

  const { toWin, metamaskFee, providerFee, exchangeFee, total } = useMemo(
    () => ({
      toWin: preview?.minAmountReceived ?? 0,
      isRateLimited: preview?.rateLimited ?? false,
      metamaskFee: fees?.metamaskFee ?? 0,
      providerFee: fees?.providerFee ?? 0,
      exchangeFee: getPredictExchangeFee(fees),
      total: totalPayForPredictBalance + depositFee,
    }),
    [
      depositFee,
      fees,
      preview?.minAmountReceived,
      preview?.rateLimited,
      totalPayForPredictBalance,
    ],
  );

  return {
    toWin,
    metamaskFee,
    providerFee,
    exchangeFee,
    depositFee,
    total,
    rewardsFeeAmount,
    totalPayForPredictBalance,
    blockingPayAlertMessage,
    hasBlockingPayAlerts,
  };
};
