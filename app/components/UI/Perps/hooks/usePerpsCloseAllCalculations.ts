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
 * - Calculates fees PER POSITION for accuracy (coin-specific rewards)
 * - Aggregates points estimation per position
 * - Handles loading states and errors across all calculations
 *
 * TODO(rewards-batch-api): Replace per-position loop with single batch call when
 * https://github.com/consensys-vertical-apps/va-mmcx-rewards/pull/247 is merged.
 * The backend will support `payload | payload[]` for batch estimation.
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

        const results = await Promise.all(
          positions.map(async (pos): Promise<PerPositionResult> => {
            try {
              // Calculate position value using current market price for accurate fee estimation
              // Fees must reflect the actual USD value being closed at current market conditions
              // Use ref to get latest price without triggering re-renders
              const currentPrice = priceDataRef.current[pos.coin]?.price
                ? parseFloat(priceDataRef.current[pos.coin].price)
                : parseFloat(pos.entryPrice); // Fallback to entry price if current price unavailable
              const size = Math.abs(parseFloat(pos.size));
              const positionValue = size * currentPrice;

              // Calculate fees via PerpsController
              const fees = await Engine.context.PerpsController.calculateFees({
                orderType: 'market',
                isMaker: false, // Market close orders are always taker
                amount: positionValue.toString(),
                coin: pos.coin,
              });

              // Calculate rewards points per position with coin-specific parameters
              let points: EstimatedPointsDto | null = null;
              try {
                const estimateBody: EstimatePointsDto = {
                  activityType: 'PERPS',
                  account: caipAccountId,
                  activityContext: {
                    perpsContext: {
                      type: 'CLOSE_POSITION',
                      usdFeeValue: (fees.feeAmount ?? 0).toString(),
                      coin: pos.coin, // ✅ Accurate per-position coin
                    },
                  },
                };

                points =
                  await Engine.context.RewardsController.estimatePoints(
                    estimateBody,
                  );
              } catch (pointsError) {
                // Log but don't fail the entire calculation if rewards estimation fails
                console.warn(
                  `Failed to estimate points for ${pos.coin}:`,
                  pointsError,
                );
              }

              return {
                position: pos,
                fees,
                points,
              };
            } catch (error) {
              return {
                position: pos,
                fees: {
                  feeRate: 0,
                  feeAmount: 0,
                  protocolFeeRate: 0,
                  protocolFeeAmount: 0,
                  metamaskFeeRate: 0,
                  metamaskFeeAmount: 0,
                },
                points: null,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          }),
        );

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
  }, [positions, selectedAddress, currentChainId]);
  // Note: priceData intentionally excluded from deps to prevent recalculation on every price update
  // Calculations use the latest priceData reference but only re-run when positions/account changes

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
      if (weight > 0) {
        weightedMetamaskFeeRate += result.fees.metamaskFeeRate * weight;
        weightedProtocolFeeRate += result.fees.protocolFeeRate * weight;
        totalWeight += weight;
      }
    });

    const avgMetamaskFeeRate =
      totalWeight > 0 ? weightedMetamaskFeeRate / totalWeight : 0;
    const avgProtocolFeeRate =
      totalWeight > 0 ? weightedProtocolFeeRate / totalWeight : 0;

    // For fee discount calculation, we need original rates from breakdown if available
    // Otherwise avgOriginalMetamaskFeeRate equals avgMetamaskFeeRate (no discount)
    const avgOriginalMetamaskFeeRate = avgMetamaskFeeRate; // Simplified for now

    // Calculate average fee discount percentage (currently 0 as we don't have original rates)
    const avgFeeDiscountPercentage = 0;

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
  }, [perPositionResults]);

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
