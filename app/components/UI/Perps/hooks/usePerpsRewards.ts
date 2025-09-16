import { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { OrderFeesResult } from './usePerpsOrderFees';
import { DEVELOPMENT_CONFIG } from '../constants/perpsConfig';

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
  // Get rewards feature flag
  const rewardsEnabled = useSelector(selectRewardsEnabledFlag);

  // Track previous points to detect refresh state
  const [previousPoints, setPreviousPoints] = useState<number | undefined>();

  // Development-only simulations
  const shouldSimulateError = useMemo(
    () =>
      __DEV__ &&
      parseFloat(orderAmount) ===
        DEVELOPMENT_CONFIG.SIMULATE_REWARDS_ERROR_AMOUNT,
    [orderAmount],
  );

  const shouldSimulateLoading = useMemo(
    () =>
      __DEV__ &&
      parseFloat(orderAmount) ===
        DEVELOPMENT_CONFIG.SIMULATE_REWARDS_LOADING_AMOUNT,
    [orderAmount],
  );

  // Determine if we should show rewards row
  const shouldShowRewardsRow = useMemo(
    () =>
      rewardsEnabled &&
      hasValidAmount &&
      (feeResults.estimatedPoints !== undefined || isFeesLoading),
    [rewardsEnabled, hasValidAmount, feeResults.estimatedPoints, isFeesLoading],
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
  };
};
