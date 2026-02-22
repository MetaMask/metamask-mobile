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
  /** Total margin across all positions (excludes P&L) */
  totalMargin: number;
  /** Total unrealized P&L across all positions */
  totalPnl: number;
  /** Total fees for closing all positions (undefined when unavailable) */
  totalFees: number | undefined;
  /** Amount user will receive after closing all positions */
  receiveAmount: number;
  /** Aggregated estimated points for closing all positions (undefined when unavailable) */
  totalEstimatedPoints: number | undefined;
  /** Average fee discount percentage across all positions (undefined when unavailable) */
  avgFeeDiscountPercentage: number | undefined;
  /** Average bonus multiplier in basis points (undefined when unavailable) */
  avgBonusBips: number | undefined;
  /** Average MetaMask fee rate across all positions (undefined when unavailable) */
  avgMetamaskFeeRate: number | undefined;
  /** Average protocol fee rate across all positions (undefined when unavailable) */
  avgProtocolFeeRate: number | undefined;
  /** Average original MetaMask fee rate before discounts (undefined when unavailable) */
  avgOriginalMetamaskFeeRate: number | undefined;
  /** Whether initial calculation is still loading (shows spinner) */
  isLoading: boolean;
  /** Whether background refresh is in progress (shows subtle indicator, keeps stale data visible) */
  isFetchingInBackground: boolean;
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

  // Lifecycle refs for cleanup and race condition prevention
  const isComponentMountedRef = useRef(true);
  const discountFetchCounterRef = useRef(0);
  const calculationCounterRef = useRef(0);

  // State for per-position calculations
  const [perPositionResults, setPerPositionResults] = useState<
    PerPositionResult[]
  >([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFetchingInBackground, setIsFetchingInBackground] = useState(false);
  const [hasCalculationError, setHasCalculationError] = useState(false);

  // State for account-level fee discount (applies uniformly to all positions)
  const [feeDiscountBips, setFeeDiscountBips] = useState<number>(0);

  // Freeze mechanism: Prevent recalculation on WebSocket updates (price changes)
  // Reset freeze when positions/account/discount changes to allow recalculation
  const hasValidResultsRef = useRef(false);
  const hasValidDiscountRef = useRef(false);

  // Calculate total margin
  const totalMargin = useMemo(
    () =>
      positions.reduce((sum, pos) => {
        const margin = Number.parseFloat(pos.marginUsed) || 0;
        return sum + margin;
      }, 0),
    [positions],
  );

  // Calculate total PnL
  const totalPnl = useMemo(
    () =>
      positions.reduce(
        (sum, pos) => sum + (Number.parseFloat(pos.unrealizedPnl) || 0),
        0,
      ),
    [positions],
  );

  // Fetch account-level fee discount (applies uniformly to all positions)
  // Freeze mechanism prevents refetching when only positions change
  useEffect(() => {
    // Increment counter to invalidate any in-flight requests
    const currentFetchId = ++discountFetchCounterRef.current;
    // Reset freeze when account changes (allow refetch for new account)
    hasValidDiscountRef.current = false;

    async function fetchFeeDiscount() {
      // Skip if already have valid discount for this account (freeze guard)
      if (hasValidDiscountRef.current) {
        return;
      }

      if (!selectedAddress || !currentChainId) {
        // Only update state if this is still the latest fetch and component is mounted
        if (
          discountFetchCounterRef.current === currentFetchId &&
          isComponentMountedRef.current
        ) {
          setFeeDiscountBips(0);
          hasValidDiscountRef.current = false;
        }
        return;
      }

      try {
        const caipAccountId = formatAccountToCaipAccountId(
          selectedAddress,
          currentChainId,
        );
        if (!caipAccountId) {
          // Only update state if this is still the latest fetch and component is mounted
          if (
            discountFetchCounterRef.current === currentFetchId &&
            isComponentMountedRef.current
          ) {
            setFeeDiscountBips(0);
            hasValidDiscountRef.current = false;
          }
          return;
        }

        const discountBips =
          await Engine.context.RewardsController.getPerpsDiscountForAccount(
            caipAccountId,
          );

        // Only update state if this is still the latest fetch and component is mounted
        if (
          discountFetchCounterRef.current === currentFetchId &&
          isComponentMountedRef.current
        ) {
          setFeeDiscountBips(discountBips);
          hasValidDiscountRef.current = true;
        }
      } catch (error) {
        console.warn('Failed to fetch fee discount:', error);
        // Only update state if this is still the latest fetch and component is mounted
        if (
          discountFetchCounterRef.current === currentFetchId &&
          isComponentMountedRef.current
        ) {
          setFeeDiscountBips(0);
          hasValidDiscountRef.current = false;
        }
      }
    }

    fetchFeeDiscount().catch((error) => {
      console.error('Unhandled error in fetchFeeDiscount:', error);
    });
  }, [selectedAddress, currentChainId]);

  // Per-position fee and rewards calculation
  // This ensures accurate coin-specific rewards calculation
  useEffect(() => {
    // Increment counter to invalidate any in-flight calculations
    const currentCalculationId = ++calculationCounterRef.current;
    // Reset freeze when meaningful inputs change (not price updates)
    // This MUST happen synchronously at effect start, before async function runs
    // Allows recalculation for: new positions, account switch, or discount arrival
    hasValidResultsRef.current = false;

    async function calculatePerPosition() {
      // Skip if already frozen (prevents recalculation on WebSocket price updates)
      // This check happens AFTER the synchronous reset above
      if (hasValidResultsRef.current) {
        return;
      }

      if (positions.length === 0) {
        // Only update state if this is still the latest calculation and component is mounted
        if (
          calculationCounterRef.current === currentCalculationId &&
          isComponentMountedRef.current
        ) {
          setPerPositionResults([]);
          setHasCalculationError(false);
        }
        return;
      }

      if (!selectedAddress || !currentChainId) {
        // Only update state if this is still the latest calculation and component is mounted
        if (
          calculationCounterRef.current === currentCalculationId &&
          isComponentMountedRef.current
        ) {
          setHasCalculationError(true);
          // Note: Don't set feeDiscountBips here - would create infinite loop since it's in deps
          // The fetchFeeDiscount effect is solely responsible for managing feeDiscountBips state
        }
        return;
      }

      // Determine if this is initial load or background refresh
      const isInitialLoad = perPositionResults.length === 0;

      // Only update state if this is still the latest calculation and component is mounted
      if (
        calculationCounterRef.current === currentCalculationId &&
        isComponentMountedRef.current
      ) {
        setIsCalculating(isInitialLoad);
        setIsFetchingInBackground(!isInitialLoad);
        setHasCalculationError(false);
      }

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
              const currentPrice = priceDataRef.current[pos.symbol]?.price
                ? parseFloat(priceDataRef.current[pos.symbol].price)
                : parseFloat(pos.entryPrice); // Fallback to entry price if current price unavailable
              const size = Math.abs(parseFloat(pos.size));
              const positionValue = size * currentPrice;

              // Calculate base fees via PerpsController (before discount)
              const baseFees =
                await Engine.context.PerpsController.calculateFees({
                  orderType: 'market',
                  isMaker: false, // Market close orders are always taker
                  amount: positionValue.toString(),
                  symbol: pos.symbol,
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

              // Recalculate total fee amount and rate with discount applied
              const adjustedTotalFee =
                baseFees.protocolFeeAmount !== undefined &&
                adjustedMetamaskFeeAmount !== undefined
                  ? baseFees.protocolFeeAmount + adjustedMetamaskFeeAmount
                  : undefined;

              // Adjust total fee rate by subtracting the discount from MetaMask component
              const adjustedTotalFeeRate =
                baseFees.feeRate !== undefined &&
                baseFees.metamaskFeeRate !== undefined &&
                adjustedMetamaskFeeRate !== undefined
                  ? baseFees.feeRate -
                    (baseFees.metamaskFeeRate - adjustedMetamaskFeeRate)
                  : undefined;

              const fees = {
                ...baseFees,
                feeRate: adjustedTotalFeeRate,
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
            coin: result.position.symbol, // EstimatePerpsContextDto uses 'coin' field
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
        // Batch API returns ONE aggregated response for ALL positions:
        // - pointsEstimate: Total points sum across all positions
        // - bonusBips: Average bonus multiplier already calculated by backend
        // All positions intentionally share the same batchPoints object reference
        const results = feeResults.map((result) => ({
          position: result.position,
          fees: result.fees,
          points: batchPoints, // Same batch result for all positions (aggregated)
          error: result.error,
        }));

        // Check if any calculation had errors
        const hasErrors = results.some((r) => r.error);

        // Only update state if this is still the latest calculation and component is mounted
        if (
          calculationCounterRef.current === currentCalculationId &&
          isComponentMountedRef.current
        ) {
          setPerPositionResults(results);
          setHasCalculationError(hasErrors);

          // Freeze results after successful calculation to prevent WebSocket price updates
          // from triggering expensive points API calls. Reset happens on position/account/discount change.
          if (!hasErrors && results.length > 0) {
            hasValidResultsRef.current = true;
          }
        }
      } catch (error) {
        console.error('Failed to calculate per-position fees:', error);
        // Only update state if this is still the latest calculation and component is mounted
        if (
          calculationCounterRef.current === currentCalculationId &&
          isComponentMountedRef.current
        ) {
          setHasCalculationError(true);
        }
      } finally {
        // Only update state if this is still the latest calculation and component is mounted
        if (
          calculationCounterRef.current === currentCalculationId &&
          isComponentMountedRef.current
        ) {
          setIsCalculating(false);
          setIsFetchingInBackground(false);
        }
      }
    }

    calculatePerPosition().catch((error) => {
      console.error('Unhandled error in calculatePerPosition:', error);
      // Only update state if this is still the latest calculation and component is mounted
      if (
        calculationCounterRef.current === currentCalculationId &&
        isComponentMountedRef.current
      ) {
        setHasCalculationError(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, selectedAddress, currentChainId, feeDiscountBips]);
  // Dependencies trigger freeze reset, allowing exactly one recalculation per change:
  // - positions: Recalculate when user opens/closes positions
  // - selectedAddress/currentChainId: Recalculate on account switch
  // - feeDiscountBips: Recalculate when discount arrives from async fetch (happens once)
  // Price updates (priceDataRef) do NOT trigger recalculation due to freeze mechanism

  // Cleanup effect to prevent state updates after component unmounts
  useEffect(
    () => () => {
      isComponentMountedRef.current = false;
    },
    [],
  );

  // Aggregate results from per-position calculations
  const aggregatedResults = useMemo(() => {
    if (perPositionResults.length === 0) {
      return {
        totalFees: undefined,
        totalEstimatedPoints: undefined,
        avgFeeDiscountPercentage: undefined,
        avgBonusBips: undefined,
        avgMetamaskFeeRate: undefined,
        avgProtocolFeeRate: undefined,
        avgOriginalMetamaskFeeRate: undefined,
        shouldShowRewards: false,
      };
    }

    // Sum fees and points
    const totalFees = perPositionResults.reduce(
      (sum, result) => sum + (result.fees.feeAmount ?? 0),
      0,
    );

    // Batch API returns aggregated total for ALL positions (not per-position)
    // All positions share the same batchPoints object, so use first result directly
    // Summing would incorrectly multiply by number of positions (e.g., 300 points × 3 positions = 900)
    const totalEstimatedPoints =
      perPositionResults.length > 0 && perPositionResults[0].points
        ? perPositionResults[0].points.pointsEstimate
        : undefined;

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
      totalWeight > 0 ? weightedMetamaskFeeRate / totalWeight : undefined;
    const avgProtocolFeeRate =
      totalWeight > 0 ? weightedProtocolFeeRate / totalWeight : undefined;

    // Calculate original MetaMask fee rate (before discount was applied)
    // The discount is applied as: discounted_rate = original_rate * (1 - discount_bips/10000)
    // Therefore: original_rate = discounted_rate / (1 - discount_bips/10000)
    // Guard against 100% discount (10000 bips) causing division by zero
    const avgOriginalMetamaskFeeRate =
      feeDiscountBips > 0 &&
      feeDiscountBips < 10000 &&
      avgMetamaskFeeRate !== undefined &&
      avgMetamaskFeeRate > 0
        ? avgMetamaskFeeRate / (1 - feeDiscountBips / 10000)
        : avgMetamaskFeeRate;

    // Convert discount from basis points to percentage for display
    // e.g., 6500 bips = 65%
    const avgFeeDiscountPercentage =
      feeDiscountBips > 0 ? feeDiscountBips / 100 : undefined;

    // Batch API returns average bonusBips already calculated by backend
    // All positions share the same batchPoints object, so use first result directly
    // Return undefined when unavailable to allow UI to show proper loading/fallback state
    const avgBonusBips =
      perPositionResults.length > 0 && perPositionResults[0].points
        ? perPositionResults[0].points.bonusBips
        : undefined;

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
    () =>
      aggregatedResults.totalFees !== undefined
        ? totalMargin - aggregatedResults.totalFees
        : totalMargin,
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
    isFetchingInBackground,
    hasError: hasCalculationError,
    shouldShowRewards: aggregatedResults.shouldShowRewards,
  };
}
