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

interface UsePredictBuyConditionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  isPreviewCalculating: boolean;
  isPlaceOrderLoading: boolean;
  isUserInputChange: boolean;
  isConfirming: boolean;
}

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isPlaceOrderLoading,
  isUserInputChange,
  isConfirming,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading } = usePredictBuyAvailableBalance();
  const { activeOrder } = usePredictActiveOrder();
  const payTotals = useTransactionPayTotals();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const isPayQuoteLoading = useIsTransactionPayQuoteLoading();
  const quotes = useTransactionPayQuotes();
  const requiredTokens = useTransactionPayRequiredTokens();
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();

  const shouldWaitForPayFees = !isPredictBalanceSelected;

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  const isDepositing = useMemo(
    () => activeOrder?.state === ActiveOrderState.DEPOSITING,
    [activeOrder],
  );

  const isPlacingOrder = useMemo(
    () =>
      activeOrder?.state === ActiveOrderState.PLACING_ORDER ||
      isPlaceOrderLoading ||
      isDepositing,
    [activeOrder?.state, isPlaceOrderLoading, isDepositing],
  );

  const isRedirecting = useMemo(
    () => activeOrder?.state === ActiveOrderState.REDIRECTING,
    [activeOrder],
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
      isRedirecting ||
      (shouldWaitForPayFees &&
        (isPayTotalsLoading || isPayQuoteLoading || isQuotesStale)),
    [
      isRedirecting,
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
      !!preview &&
      !isPlaceOrderLoading &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isRedirecting &&
      !isPayFeesLoading,
    [
      isConfirming,
      isBelowMinimum,
      preview,
      isPlaceOrderLoading,
      isRateLimited,
      isBalanceLoading,
      isRedirecting,
      isPayFeesLoading,
    ],
  );

  const isUserChangeTriggeringCalculation = useMemo(
    () => isPreviewCalculating && isUserInputChange,
    [isPreviewCalculating, isUserInputChange],
  );

  return {
    isBelowMinimum,
    isRateLimited,
    isPlacingOrder,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
  };
};
