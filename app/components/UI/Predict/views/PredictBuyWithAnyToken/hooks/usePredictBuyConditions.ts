import { useMemo } from 'react';
import { MINIMUM_BET } from '../../../constants/transactions';
import { ActiveOrderState, OrderPreview } from '../../../types';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { usePredictDeposit } from '../../../hooks/usePredictDeposit';

interface UsePredictBuyConditionsParams {
  currentValue: number;
  total: number;
  depositFee: number;
  preview?: OrderPreview | null;
  isPreviewCalculating: boolean;
  isPlaceOrderLoading: boolean;
  isUserInputChange: boolean;
  isConfirming: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  depositFee,
  isPreviewCalculating,
  isPlaceOrderLoading,
  isUserInputChange,
  isConfirming,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading, availableBalance } =
    usePredictBuyAvailableBalance();
  const { activeOrder } = usePredictActiveOrder();
  const payTotals = useTransactionPayTotals();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const isPayQuoteLoading = useIsTransactionPayQuoteLoading();
  const quotes = useTransactionPayQuotes();
  const requiredTokens = useTransactionPayRequiredTokens();
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();
  const { isDepositPending } = usePredictDeposit();

  const shouldWaitForPayFees = !isPredictBalanceSelected;

  const currentState = useMemo(() => activeOrder?.state, [activeOrder]);

  const isBalancePulsing = useMemo(
    () => isDepositPending && isPredictBalanceSelected,
    [isDepositPending, isPredictBalanceSelected],
  );

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const maxBetAmount = useMemo(() => {
    const feeRate = (preview?.fees?.totalFeePercentage ?? 0) / 100;
    return Math.max(
      0,
      Math.floor(((availableBalance - depositFee) / (1 + feeRate)) * 100) / 100,
    );
  }, [availableBalance, depositFee, preview?.fees?.totalFeePercentage]);

  const isInsufficientBalance = useMemo(
    () => !isConfirming && currentValue > 0 && currentValue > maxBetAmount,
    [isConfirming, currentValue, maxBetAmount],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  const isDepositing = useMemo(
    () =>
      currentState === ActiveOrderState.DEPOSITING ||
      currentState === ActiveOrderState.DEPOSIT,
    [currentState],
  );

  const isPlacingOrder = useMemo(
    () =>
      currentState === ActiveOrderState.PLACE_ORDER ||
      currentState === ActiveOrderState.PLACING_ORDER ||
      isPlaceOrderLoading ||
      isDepositing,
    [currentState, isPlaceOrderLoading, isDepositing],
  );

  // Workaround: TransactionPayController sets paymentToken and isLoading in
  // separate state updates, causing a render with stale totals + loading=false.
  // Compare quote source token with selected token to bridge the gap.
  const isQuotesStale = useMemo(() => {
    if (
      !shouldWaitForPayFees ||
      isPredictBalanceSelected ||
      !selectedPaymentToken
    ) {
      return false;
    }
    if (!quotes && !payTotals) {
      return false;
    }
    if (!quotes?.length) {
      const isPaymentTokenRequired = requiredTokens?.some(
        (token) =>
          token.address.toLowerCase() ===
            selectedPaymentToken.address?.toLowerCase() &&
          token.chainId.toLowerCase() ===
            selectedPaymentToken.chainId?.toLowerCase(),
      );
      return !isPaymentTokenRequired;
    }
    const request = quotes[0]?.request;
    if (!request) {
      return false;
    }
    return (
      request.sourceTokenAddress?.toLowerCase() !==
        selectedPaymentToken.address?.toLowerCase() ||
      request.sourceChainId?.toLowerCase() !==
        selectedPaymentToken.chainId?.toLowerCase()
    );
  }, [
    shouldWaitForPayFees,
    isPredictBalanceSelected,
    selectedPaymentToken,
    quotes,
    payTotals,
    requiredTokens,
  ]);

  const isPayFeesLoading = useMemo(
    () =>
      shouldWaitForPayFees &&
      (isPayTotalsLoading || isPayQuoteLoading || isQuotesStale),
    [
      shouldWaitForPayFees,
      isPayTotalsLoading,
      isPayQuoteLoading,
      isQuotesStale,
    ],
  );

  const canPlaceBet = useMemo(
    () =>
      !isConfirming &&
      !isBelowMinimum &&
      !isInsufficientBalance &&
      !!preview &&
      !isPlaceOrderLoading &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isPayFeesLoading,
    [
      isConfirming,
      isBelowMinimum,
      isInsufficientBalance,
      preview,
      isPlaceOrderLoading,
      isRateLimited,
      isBalanceLoading,
      isPayFeesLoading,
    ],
  );

  const isUserChangeTriggeringCalculation = useMemo(
    () => isPreviewCalculating && isUserInputChange,
    [isPreviewCalculating, isUserInputChange],
  );

  return {
    isBelowMinimum,
    isInsufficientBalance,
    maxBetAmount,
    isRateLimited,
    isPlacingOrder,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    isBalancePulsing,
  };
};
