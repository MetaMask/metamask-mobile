import { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { Position, FeeCalculationResult } from '../controllers/types';
import type {
  EstimatePointsDto,
  EstimatedPointsDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectChainId } from '../../../../selectors/networkController';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';

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
  /** Current market prices for fee calculation. Format: { [symbol]: { price: string } } */
  priceData: Record<string, { price: string }>;
}

/**
 * Per-position calculation result
 */
interface PerPositionResult {
  position: Position;
  fees: FeeCalculationResult;
  points: EstimatedPointsDto | null;
  error?: string;
}

/**
 * Hook to aggregate fee calculations and points estimation across multiple positions
 *
 * This hook:
 * - Fetches account-level fee discount (applies uniformly to all positions)
 * - Calculates fees PER POSITION for accuracy (coin-specific parameters)
 * - Uses BATCH points estimation API for performance (single API call for all positions)
 * - Handles loading states and errors across all calculations
 *
 * @example
 * ```tsx
 * const calculations = usePerpsCloseAllCalculations({
 *   positions,
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
  priceData,
}: UsePerpsCloseAllCalculationsParams): CloseAllCalculationsResult {
  // Selectors for account and chain
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const currentChainId = useSelector(selectChainId);

  // Use ref to access latest priceData without triggering re-renders
  const priceDataRef = useRef(priceData);
  priceDataRef.current = priceData;

  // State for per-position calculations
  const [perPositionResults, setPerPositionResults] = useState<
    PerPositionResult[]
  >([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculationError, setHasCalculationError] = useState(false);

  // State for account-level fee discount (applies uniformly to all positions)
  const [feeDiscountBips, setFeeDiscountBips] = useState<number>(0);

  // Prevent slow points computation from retriggering on WebSocket position updates
  // Once we have valid results, freeze them to avoid recalculation failures showing 0 points
  const hasValidResultsRef = useRef(false);

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

  // Fetch account-level fee discount (applies uniformly to all positions)
  // This runs once per account change and is cached by RewardsController
  useEffect(() => {
    async function fetchFeeDiscount() {
      if (!selectedAddress || !currentChainId) {
        return;
      }

      try {
        const caipAccountId = formatAccountToCaipAccountId(
          selectedAddress,
          currentChainId,
        );
        if (!caipAccountId) {
          return;
        }

        const discountBips =
          await Engine.context.RewardsController.getPerpsDiscountForAccount(
            caipAccountId,
          );
        setFeeDiscountBips(discountBips);
      } catch (error) {
        console.warn('Failed to fetch fee discount:', error);
        setFeeDiscountBips(0);
      }
    }

    fetchFeeDiscount().catch((error) => {
      console.error('Unhandled error in fetchFeeDiscount:', error);
    });
  }, [selectedAddress, currentChainId]);

  // Per-position fee and rewards calculation
  // This ensures accurate coin-specific rewards calculation
  useEffect(() => {
    // Skip recalculation if we already have valid results
    // Prevents slow points API calls from retriggering on WebSocket position updates
    if (hasValidResultsRef.current) {
      return;
    }

    async function calculatePerPosition() {
      if (positions.length === 0) {
        setPerPositionResults([]);
        setHasCalculationError(false);
        return;
      }

      if (!selectedAddress || !currentChainId) {
        setHasCalculationError(true);
        return;
      }

      setIsCalculating(true);
      setHasCalculationError(false);

      try {
        // Convert address to CAIP format for rewards API
        const caipAccountId = formatAccountToCaipAccountId(
          selectedAddress,
          currentChainId,
        );
        if (!caipAccountId) {
          throw new Error('Failed to format account to CAIP ID');
        }

        // Step 1: Calculate fees for all positions in parallel
        const feeResults = await Promise.all(
          positions.map(async (pos) => {
            try {
              // Calculate position value using current market price for accurate fee estimation
              // Fees must reflect the actual USD value being closed at current market conditions
              // Use ref to get latest price without triggering re-renders
              const currentPrice = priceDataRef.current[pos.coin]?.price
                ? parseFloat(priceDataRef.current[pos.coin].price)
                : parseFloat(pos.entryPrice); // Fallback to entry price if current price unavailable
              const size = Math.abs(parseFloat(pos.size));
              const positionValue = size * currentPrice;

              // Calculate base fees via PerpsController (before discount)
              const baseFees =
                await Engine.context.PerpsController.calculateFees({
                  orderType: 'market',
                  isMaker: false, // Market close orders are always taker
                  amount: positionValue.toString(),
                  coin: pos.coin,
                });

              // Apply account-level discount to MetaMask fee
              // Discount formula: adjusted_rate = original_rate * (1 - discount_bips/10000)
              const discountMultiplier =
                feeDiscountBips > 0 ? 1 - feeDiscountBips / 10000 : 1;
              const adjustedMetamaskFeeRate =
                baseFees.metamaskFeeRate !== undefined
                  ? baseFees.metamaskFeeRate * discountMultiplier
                  : undefined;

              // Preserve undefined state if base fees are undefined - don't default to 0
              // Undefined indicates error/unavailable state, which should be handled at UI layer
              const adjustedMetamaskFeeAmount =
                baseFees.metamaskFeeAmount !== undefined
                  ? baseFees.metamaskFeeAmount * discountMultiplier
                  : undefined;

              // Recalculate total fee with discount applied only if both values are defined
              const adjustedTotalFee =
                baseFees.protocolFeeAmount !== undefined &&
                adjustedMetamaskFeeAmount !== undefined
                  ? baseFees.protocolFeeAmount + adjustedMetamaskFeeAmount
                  : undefined;

              const fees = {
                ...baseFees,
                metamaskFeeRate: adjustedMetamaskFeeRate,
                metamaskFeeAmount: adjustedMetamaskFeeAmount,
                feeAmount: adjustedTotalFee,
              };

              return {
                position: pos,
                fees,
                error: undefined,
              };
            } catch (error) {
              return {
                position: pos,
                fees: {
                  feeRate: undefined,
                  feeAmount: undefined,
                  protocolFeeRate: undefined,
                  protocolFeeAmount: undefined,
                  metamaskFeeRate: undefined,
                  metamaskFeeAmount: undefined,
                },
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          }),
        );

        // Step 2: Batch points estimation for all positions in a single API call
        // Using batch API to improve performance (N+1 → 2 API calls)
        let batchPoints: EstimatedPointsDto | null = null;
        try {
          const perpsContextArray = feeResults.map((result) => ({
            type: 'CLOSE_POSITION' as const,
            usdFeeValue: (result.fees.feeAmount ?? 0).toString(),
            coin: result.position.coin,
          }));

          const batchEstimateBody: EstimatePointsDto = {
            activityType: 'PERPS',
            account: caipAccountId,
            activityContext: {
              perpsContext: perpsContextArray, // Batch API: array of positions
            },
          };

          batchPoints =
            await Engine.context.RewardsController.estimatePoints(
              batchEstimateBody,
            );
        } catch (pointsError) {
          console.warn('Failed to estimate batch points:', pointsError);
        }

        // Step 3: Combine fee results with batch points
        // Batch API returns aggregated points (sum) and average bonus
        const results = feeResults.map((result) => ({
          position: result.position,
          fees: result.fees,
          points: batchPoints, // Same batch result for all positions (aggregated)
          error: result.error,
        }));

        setPerPositionResults(results);

        // Check if any calculation had errors
        const hasErrors = results.some((r) => r.error);
        setHasCalculationError(hasErrors);

        // Mark as valid if calculation succeeded (no errors and has results)
        // Freezes results to prevent slow points computation from retriggering
        if (!hasErrors && results.length > 0) {
          hasValidResultsRef.current = true;
        }
      } catch (error) {
        console.error('Failed to calculate per-position fees:', error);
        setHasCalculationError(true);
      } finally {
        setIsCalculating(false);
      }
    }

    calculatePerPosition().catch((error) => {
      console.error('Unhandled error in calculatePerPosition:', error);
      setHasCalculationError(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, selectedAddress, currentChainId]);
  // Note: priceData and feeDiscountBips intentionally excluded from deps to prevent recalculation on every update
  // - priceData: Uses ref to get latest price without triggering re-renders
  // - feeDiscountBips: Fetched separately, will be applied on next calculation trigger (positions/account change)
  //   Including it in deps would cause recalculation on every WebSocket position update after discount arrives

  // Aggregate results from per-position calculations
  const aggregatedResults = useMemo(() => {
    if (perPositionResults.length === 0) {
      return {
        totalFees: 0,
        totalEstimatedPoints: 0,
        avgFeeDiscountPercentage: 0,
        avgBonusBips: 0,
        avgMetamaskFeeRate: 0,
        avgProtocolFeeRate: 0,
        avgOriginalMetamaskFeeRate: 0,
        shouldShowRewards: false,
      };
    }

    // Sum fees and points
    const totalFees = perPositionResults.reduce(
      (sum, result) => sum + (result.fees.feeAmount ?? 0),
      0,
    );

    const totalEstimatedPoints = perPositionResults.reduce(
      (sum, result) => sum + (result.points?.pointsEstimate ?? 0),
      0,
    );

    // Calculate weighted averages based on fee amounts
    let weightedMetamaskFeeRate = 0;
    let weightedProtocolFeeRate = 0;
    let totalWeight = 0;

    perPositionResults.forEach((result) => {
      const weight = result.fees.feeAmount ?? 0;
      if (
        weight > 0 &&
        result.fees.metamaskFeeRate !== undefined &&
        result.fees.protocolFeeRate !== undefined
      ) {
        weightedMetamaskFeeRate += result.fees.metamaskFeeRate * weight;
        weightedProtocolFeeRate += result.fees.protocolFeeRate * weight;
        totalWeight += weight;
      }
    });

    const avgMetamaskFeeRate =
      totalWeight > 0 ? weightedMetamaskFeeRate / totalWeight : 0;
    const avgProtocolFeeRate =
      totalWeight > 0 ? weightedProtocolFeeRate / totalWeight : 0;

    // Calculate original MetaMask fee rate (before discount was applied)
    // The discount is applied as: discounted_rate = original_rate * (1 - discount_bips/10000)
    // Therefore: original_rate = discounted_rate / (1 - discount_bips/10000)
    const avgOriginalMetamaskFeeRate =
      feeDiscountBips > 0 && avgMetamaskFeeRate > 0
        ? avgMetamaskFeeRate / (1 - feeDiscountBips / 10000)
        : avgMetamaskFeeRate;

    // Convert discount from basis points to percentage for display
    // e.g., 6500 bips = 65%
    const avgFeeDiscountPercentage =
      feeDiscountBips > 0 ? feeDiscountBips / 100 : 0;

    // Calculate average bonus bips (weighted by points)
    let weightedBonusBips = 0;
    let totalPointsWeight = 0;
    perPositionResults.forEach((result) => {
      const pointsWeight = result.points?.pointsEstimate ?? 0;
      if (pointsWeight > 0 && result.points) {
        weightedBonusBips += result.points.bonusBips * pointsWeight;
        totalPointsWeight += pointsWeight;
      }
    });
    const avgBonusBips =
      totalPointsWeight > 0 ? weightedBonusBips / totalPointsWeight : 0;

    // Show rewards if at least one position has valid points
    const shouldShowRewards = perPositionResults.some(
      (result) => result.points !== null && result.points.pointsEstimate > 0,
    );

    return {
      totalFees,
      totalEstimatedPoints,
      avgFeeDiscountPercentage,
      avgBonusBips,
      avgMetamaskFeeRate,
      avgProtocolFeeRate,
      avgOriginalMetamaskFeeRate,
      shouldShowRewards,
    };
  }, [perPositionResults, feeDiscountBips]);

  // Calculate final receive amount
  const receiveAmount = useMemo(
    () => totalMargin - aggregatedResults.totalFees,
    [totalMargin, aggregatedResults.totalFees],
  );

  return {
    totalMargin,
    totalPnl,
    totalFees: aggregatedResults.totalFees,
    receiveAmount,
    totalEstimatedPoints: aggregatedResults.totalEstimatedPoints,
    avgFeeDiscountPercentage: aggregatedResults.avgFeeDiscountPercentage,
    avgBonusBips: aggregatedResults.avgBonusBips,
    avgMetamaskFeeRate: aggregatedResults.avgMetamaskFeeRate,
    avgProtocolFeeRate: aggregatedResults.avgProtocolFeeRate,
    avgOriginalMetamaskFeeRate: aggregatedResults.avgOriginalMetamaskFeeRate,
    isLoading: isCalculating,
    hasError: hasCalculationError,
    shouldShowRewards: aggregatedResults.shouldShowRewards,
  };
}
