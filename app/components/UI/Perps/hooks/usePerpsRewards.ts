import { useEffect, useMemo, useState } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { DEVELOPMENT_CONFIG } from '../constants/perpsConfig';
import { OrderFeesResult } from './usePerpsOrderFees';
import { usePerpsRewardAccountOptedIn } from './usePerpsRewardAccountOptedIn';

interface UsePerpsRewardsParams {
  /** Result from usePerpsOrderFees hook containing rewards data */
  feeResults: OrderFeesResult;
  /** Whether order amount is greater than 0 */
  hasValidAmount: boolean;
  /** Loading state from fees calculation */
  isFeesLoading?: boolean;
  /** Order amount string for development simulation */
  orderAmount?: string;
}

interface UsePerpsRewardsResult {
  /** Whether to show the rewards row */
  shouldShowRewardsRow: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Estimated points to be earned */
  estimatedPoints: number | undefined;
  /** Bonus multiplier in basis points */
  bonusBips: number | undefined;
  /** Fee discount percentage */
  feeDiscountPercentage: number | undefined;
  /** Error state */
  hasError: boolean;
  /** Whether this is a refresh operation (points value changed) */
  isRefresh: boolean;
  /** Whether the account has opted in to rewards */
  accountOptedIn: boolean | null;
  /** The account that is currently in scope */
  account?: InternalAccount | null;
}

/**
 * Hook for managing Perps rewards display state.
 * Adapts the Bridge rewards pattern for Perps context using existing usePerpsOrderFees data.
 */
export const usePerpsRewards = ({
  feeResults,
  hasValidAmount,
  isFeesLoading = false,
  orderAmount = '',
}: UsePerpsRewardsParams): UsePerpsRewardsResult => {
  // Track previous points to detect refresh state
  const [previousPoints, setPreviousPoints] = useState<number | undefined>();

  // Use the extracted hook for opt-in status
  const { accountOptedIn, account: selectedAccount } =
    usePerpsRewardAccountOptedIn(feeResults?.estimatedPoints);

  // Development-only simulations for testing different states
  // Amount "42": Triggers error state to test error handling UI
  const shouldSimulateError = useMemo(
    () =>
      __DEV__ &&
      Number.parseFloat(orderAmount) ===
        DEVELOPMENT_CONFIG.SIMULATE_REWARDS_ERROR_AMOUNT,
    [orderAmount],
  );

  // Amount "43": Triggers loading state to test loading UI
  const shouldSimulateLoading = useMemo(
    () =>
      __DEV__ &&
      Number.parseFloat(orderAmount) ===
        DEVELOPMENT_CONFIG.SIMULATE_REWARDS_LOADING_AMOUNT,
    [orderAmount],
  );

  // Determine if we should show rewards row
  // Show row if: has valid amount AND (opt-in check passed OR we're still checking)
  const shouldShowRewardsRow = useMemo(
    () => hasValidAmount && accountOptedIn !== null,
    [hasValidAmount, accountOptedIn],
  );

  // Determine loading state
  const isLoading = useMemo(
    () =>
      isFeesLoading ||
      feeResults.isLoadingMetamaskFee ||
      (shouldShowRewardsRow && feeResults.estimatedPoints === undefined) ||
      shouldSimulateLoading,
    [
      isFeesLoading,
      feeResults.isLoadingMetamaskFee,
      shouldShowRewardsRow,
      feeResults.estimatedPoints,
      shouldSimulateLoading,
    ],
  );

  // Determine error state
  const hasError = useMemo(
    () => !!(feeResults.error && shouldShowRewardsRow) || shouldSimulateError,
    [feeResults.error, shouldShowRewardsRow, shouldSimulateError],
  );

  // Determine refresh state (when points change)
  const isRefresh = useMemo(
    () =>
      previousPoints !== undefined &&
      feeResults.estimatedPoints !== undefined &&
      previousPoints !== feeResults.estimatedPoints &&
      !isLoading &&
      !hasError,
    [previousPoints, feeResults.estimatedPoints, isLoading, hasError],
  );

  // Update previous points when current points change
  useEffect(() => {
    if (feeResults.estimatedPoints !== undefined) {
      setPreviousPoints(feeResults.estimatedPoints);
    }
  }, [feeResults.estimatedPoints]);

  return {
    shouldShowRewardsRow,
    isLoading,
    estimatedPoints: feeResults.estimatedPoints,
    bonusBips: feeResults.bonusBips,
    feeDiscountPercentage: feeResults.feeDiscountPercentage,
    hasError,
    isRefresh,
    accountOptedIn,
    account: selectedAccount,
  };
};
