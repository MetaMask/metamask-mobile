import { useMemo } from 'react';
import type { Position } from '../controllers/types';
import { usePerpsOrderFees } from './usePerpsOrderFees';
import { usePerpsRewards } from './usePerpsRewards';

/**
 * Aggregated calculations result for closing all positions
 */
export interface CloseAllCalculationsResult {
  /** Total margin across all positions (includes P&L) */
  totalMargin: number;
  /** Total unrealized P&L across all positions */
  totalPnl: number;
  /** Total fees for closing all positions */
  totalFees: number;
  /** Amount user will receive after closing all positions */
  receiveAmount: number;
  /** Aggregated estimated points for closing all positions */
  totalEstimatedPoints: number;
  /** Average fee discount percentage across all positions */
  avgFeeDiscountPercentage: number;
  /** Average bonus multiplier in basis points */
  avgBonusBips: number;
  /** Average MetaMask fee rate across all positions (as decimal, e.g. 0.01 for 1%) */
  avgMetamaskFeeRate: number;
  /** Average protocol fee rate across all positions (as decimal, e.g. 0.00045 for 0.045%) */
  avgProtocolFeeRate: number;
  /** Average original MetaMask fee rate before discounts (as decimal) */
  avgOriginalMetamaskFeeRate: number;
  /** Whether any fee calculation is still loading */
  isLoading: boolean;
  /** Whether there was an error in any calculation */
  hasError: boolean;
  /** Whether rewards should be shown (at least one position has valid rewards) */
  shouldShowRewards: boolean;
}

interface UsePerpsCloseAllCalculationsParams {
  /** Array of positions to close */
  positions: Position[];
  /** Current market prices for each coin */
  currentPrices?: Record<string, number>;
}

/**
 * Hook to aggregate fee calculations and points estimation across multiple positions
 *
 * This hook:
 * - Calculates total margin and P&L across all positions
 * - Uses usePerpsOrderFees for each position to get accurate fee calculations
 * - Aggregates points estimation using usePerpsRewards
 * - Handles loading states and errors across all calculations
 *
 * @example
 * ```tsx
 * const calculations = usePerpsCloseAllCalculations({
 *   positions,
 *   currentPrices: priceData,
 * });
 *
 * return (
 *   <View>
 *     <Text>Total Fees: {calculations.totalFees}</Text>
 *     <Text>Estimated Points: {calculations.totalEstimatedPoints}</Text>
 *     <Text>You'll Receive: {calculations.receiveAmount}</Text>
 *   </View>
 * );
 * ```
 */
export function usePerpsCloseAllCalculations({
  positions,
  currentPrices = {},
}: UsePerpsCloseAllCalculationsParams): CloseAllCalculationsResult {
  // Calculate position values using current prices or fallback to position values
  const positionValues = useMemo(
    () =>
      positions.map((pos) => {
        const price = currentPrices[pos.coin] ?? parseFloat(pos.entryPrice);
        const size = Math.abs(parseFloat(pos.size));
        return size * price;
      }),
    [positions, currentPrices],
  );

  // Calculate total margin (including P&L)
  const totalMargin = useMemo(
    () =>
      positions.reduce((sum, pos) => {
        const margin = parseFloat(pos.marginUsed) || 0;
        const pnl = parseFloat(pos.unrealizedPnl) || 0;
        return sum + margin + pnl;
      }, 0),
    [positions],
  );

  // Calculate total PnL
  const totalPnl = useMemo(
    () =>
      positions.reduce(
        (sum, pos) => sum + (parseFloat(pos.unrealizedPnl) || 0),
        0,
      ),
    [positions],
  );

  // Get aggregated fee results for all positions with a single hook call
  const feeResult = usePerpsOrderFees(
    positions.map((pos, index) => ({
      orderType: 'market' as const,
      amount: positionValues[index]?.toString() || '0',
      isMaker: false,
      coin: pos.coin,
      isClosing: true,
    })),
  );

  // Fee calculations are already aggregated by usePerpsOrderFees
  const {
    totalFees,
    avgFeeDiscountPercentage,
    avgMetamaskFeeRate,
    avgProtocolFeeRate,
    avgOriginalMetamaskFeeRate,
    isLoadingFees,
    hasFeesError,
  } = useMemo(
    () => ({
      totalFees: feeResult.totalFee,
      avgFeeDiscountPercentage: feeResult.feeDiscountPercentage ?? 0,
      avgMetamaskFeeRate: feeResult.metamaskFeeRate,
      avgProtocolFeeRate: feeResult.protocolFeeRate,
      avgOriginalMetamaskFeeRate:
        feeResult.originalMetamaskFeeRate ?? feeResult.metamaskFeeRate,
      isLoadingFees: feeResult.isLoadingMetamaskFee,
      hasFeesError: feeResult.error !== null,
    }),
    [feeResult],
  );

  // Get rewards state for the aggregated fee result
  const hasValidAmount = positions.length > 0;
  const totalAmount = positions.reduce(
    (sum, _pos, index) => sum + (positionValues[index] || 0),
    0,
  );

  const rewardsState = usePerpsRewards({
    feeResults: feeResult,
    hasValidAmount,
    isFeesLoading: feeResult.isLoadingMetamaskFee,
    orderAmount: totalAmount.toString(),
  });

  // Rewards are already aggregated by usePerpsOrderFees and usePerpsRewards
  const {
    totalEstimatedPoints,
    avgBonusBips,
    isLoadingRewards,
    hasRewardsError,
    shouldShowRewards,
  } = useMemo(
    () => ({
      totalEstimatedPoints: rewardsState.estimatedPoints ?? 0,
      avgBonusBips: rewardsState.bonusBips ?? 0,
      isLoadingRewards: rewardsState.isLoading,
      hasRewardsError: rewardsState.hasError,
      shouldShowRewards: rewardsState.shouldShowRewardsRow,
    }),
    [rewardsState],
  );

  // Calculate final receive amount
  const receiveAmount = useMemo(
    () => totalMargin - totalFees,
    [totalMargin, totalFees],
  );

  return {
    totalMargin,
    totalPnl,
    totalFees,
    receiveAmount,
    totalEstimatedPoints,
    avgFeeDiscountPercentage,
    avgBonusBips,
    avgMetamaskFeeRate,
    avgProtocolFeeRate,
    avgOriginalMetamaskFeeRate,
    isLoading: isLoadingFees || isLoadingRewards,
    hasError: hasFeesError || hasRewardsError,
    shouldShowRewards,
  };
}
