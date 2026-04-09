import { useEffect, useMemo } from 'react';
import {
  useIsTransactionPayLoading,
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../../../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { MINIMUM_BET } from '../../../constants/transactions';
import { usePredictDeposit } from '../../../hooks/usePredictDeposit';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { OrderPreview } from '../../../types';
import { usePredictBuyAvailableBalance } from './usePredictBuyAvailableBalance';
import { useInsufficientPayTokenBalanceAlert } from '../../../../../Views/confirmations/hooks/alerts/useInsufficientPayTokenBalanceAlert';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { EMPTY_ADDRESS } from '../../../../../../constants/transaction';
import { usePredictBalance } from '../../../hooks/usePredictBalance';

interface UsePredictBuyConditionsParams {
  currentValue: number;
  preview?: OrderPreview | null;
  isPreviewCalculating: boolean;
  isUserInputChange: boolean;
  isConfirming: boolean;
  totalPayForPredictBalance: number;
  isInputFocused: boolean;
}

const normalizeQuoteComparableAddress = (
  address?: string,
  chainId?: string,
) => {
  if (!address || !chainId) {
    return address?.toLowerCase();
  }

  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);

  return address.toLowerCase() === nativeTokenAddress.toLowerCase()
    ? EMPTY_ADDRESS
    : address.toLowerCase();
};

export const usePredictBuyConditions = ({
  preview,
  currentValue,
  isPreviewCalculating,
  isUserInputChange,
  isConfirming,
  totalPayForPredictBalance,
  isInputFocused,
}: UsePredictBuyConditionsParams) => {
  const { isBalanceLoading, availableBalance } =
    usePredictBuyAvailableBalance();
  const isPayTotalsLoading = useIsTransactionPayLoading();
  const isPayQuoteLoading = useIsTransactionPayQuoteLoading();
  const { isDepositPending } = usePredictDeposit();
  const payTotals = useTransactionPayTotals();
  const quotes = useTransactionPayQuotes();
  const requiredTokens = useTransactionPayRequiredTokens();
  const {
    isPredictBalanceSelected,
    selectedPaymentToken,
    resetSelectedPaymentToken,
  } = usePredictPaymentToken();
  const { data: predictBalance = 0 } = usePredictBalance();

  const [insufficientPayTokenBalanceAlert] =
    useInsufficientPayTokenBalanceAlert();

  const shouldWaitForPayFees = !isPredictBalanceSelected && currentValue > 0;

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
      Math.floor((availableBalance / (1 + feeRate)) * 100) / 100,
    );
  }, [availableBalance, preview?.fees?.totalFeePercentage]);

  const isInsufficientBalance = useMemo(
    () =>
      isPredictBalanceSelected &&
      !isConfirming &&
      currentValue > 0 &&
      currentValue > maxBetAmount,
    [isConfirming, isPredictBalanceSelected, currentValue, maxBetAmount],
  );

  const isInsufficientPayTokenBalance = useMemo(
    () => !isPredictBalanceSelected && !!insufficientPayTokenBalanceAlert,
    [isPredictBalanceSelected, insufficientPayTokenBalanceAlert],
  );

  const isRateLimited = useMemo(() => preview?.rateLimited ?? false, [preview]);

  const isPaymentTokenRequired = useMemo(() => {
    if (!selectedPaymentToken || !requiredTokens?.length) {
      return false;
    }
    return requiredTokens.some(
      (token) =>
        normalizeQuoteComparableAddress(token.address, token.chainId) ===
          normalizeQuoteComparableAddress(
            selectedPaymentToken.address,
            selectedPaymentToken.chainId,
          ) &&
        token.chainId.toLowerCase() ===
          selectedPaymentToken.chainId?.toLowerCase(),
    );
  }, [selectedPaymentToken, requiredTokens]);

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
      return !isPaymentTokenRequired;
    }
    const request = quotes[0]?.request;
    if (!request) {
      return false;
    }
    return (
      normalizeQuoteComparableAddress(
        request.sourceTokenAddress,
        request.sourceChainId,
      ) !==
        normalizeQuoteComparableAddress(
          selectedPaymentToken.address,
          selectedPaymentToken.chainId,
        ) ||
      request.sourceChainId?.toLowerCase() !==
        selectedPaymentToken.chainId?.toLowerCase()
    );
  }, [
    shouldWaitForPayFees,
    isPredictBalanceSelected,
    selectedPaymentToken,
    quotes,
    payTotals,
    isPaymentTokenRequired,
  ]);

  const isPayFeesLoading = useMemo(
    () =>
      shouldWaitForPayFees &&
      (isPayTotalsLoading ||
        isPayQuoteLoading ||
        isQuotesStale ||
        (quotes?.length === 0 && !payTotals)),
    [
      shouldWaitForPayFees,
      isPayTotalsLoading,
      isPayQuoteLoading,
      isQuotesStale,
      payTotals,
      quotes?.length,
    ],
  );

  const canPlaceBet = useMemo(
    () =>
      !isConfirming &&
      !isBelowMinimum &&
      !isInsufficientBalance &&
      !!preview &&
      !isRateLimited &&
      !isBalanceLoading &&
      !isPayFeesLoading &&
      !isInsufficientPayTokenBalance,
    [
      isConfirming,
      isBelowMinimum,
      isInsufficientBalance,
      preview,
      isRateLimited,
      isBalanceLoading,
      isPayFeesLoading,
      isInsufficientPayTokenBalance,
    ],
  );

  const isUserChangeTriggeringCalculation = useMemo(
    () => isPreviewCalculating && isUserInputChange,
    [isPreviewCalculating, isUserInputChange],
  );

  const canSelectToken = useMemo(
    () =>
      totalPayForPredictBalance > predictBalance ||
      predictBalance < MINIMUM_BET,
    [predictBalance, totalPayForPredictBalance],
  );

  useEffect(() => {
    if (
      !isPredictBalanceSelected &&
      !isInputFocused &&
      totalPayForPredictBalance > 0 &&
      predictBalance >= totalPayForPredictBalance
    ) {
      resetSelectedPaymentToken();
    }
  }, [
    isInputFocused,
    isPredictBalanceSelected,
    predictBalance,
    resetSelectedPaymentToken,
    totalPayForPredictBalance,
  ]);

  return {
    isBelowMinimum,
    isInsufficientBalance,
    maxBetAmount,
    isRateLimited,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    isBalancePulsing,
    canSelectToken,
  };
};
