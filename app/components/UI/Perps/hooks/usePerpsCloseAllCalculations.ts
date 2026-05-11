import { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  BUILDER_FEE_CONFIG,
  formatAccountToCaipAccountId,
  type Position,
  type FeeCalculationResult,
  type HyperliquidBuilderFees,
} from '@metamask/perps-controller';
import type {
  EstimatePointsDto,
  EstimatedPointsDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Engine from '../../../../core/Engine';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectChainId } from '../../../../selectors/networkController';

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
  originalMetamaskFeeRate: number | undefined;
  points: EstimatedPointsDto | null;
  error?: string;
}

function parseVipBuilderFeeRate(
  fees: HyperliquidBuilderFees | null | undefined,
): number | undefined {
  const builderFeeBips = Number(fees?.builderFeeBips);
  const maxFeeBips = BUILDER_FEE_CONFIG.MaxFeeTenthsBps / 10;

  if (
    !fees?.builderCode ||
    !Number.isFinite(builderFeeBips) ||
    builderFeeBips < 0 ||
    builderFeeBips > maxFeeBips
  ) {
    return undefined;
  }

  return builderFeeBips / 10000;
}

function calculateFeeDiscountPercentage(
  originalRate: number | undefined,
  adjustedRate: number | undefined,
): number | undefined {
  if (
    originalRate === undefined ||
    adjustedRate === undefined ||
    originalRate <= 0 ||
    adjustedRate >= originalRate
  ) {
    return undefined;
  }

  return ((originalRate - adjustedRate) / originalRate) * 100;
}

/**
 * Hook to aggregate fee calculations and points estimation across multiple positions
 *
 * This hook:
 * - Fetches account-level VIP builder fee (applies uniformly to all positions)
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
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const selectedAddress = evmAccount?.address;
  const currentChainId = useSelector(selectChainId);

  // Use ref to access latest priceData without triggering re-renders
  const priceDataRef = useRef(priceData);
  priceDataRef.current = priceData;

  // Lifecycle refs for cleanup and race condition prevention
  const isComponentMountedRef = useRef(true);
  const vipFeesFetchCounterRef = useRef(0);
  const calculationCounterRef = useRef(0);

  // State for per-position calculations
  const [perPositionResults, setPerPositionResults] = useState<
    PerPositionResult[]
  >([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFetchingInBackground, setIsFetchingInBackground] = useState(false);
  const [hasCalculationError, setHasCalculationError] = useState(false);

  // State for account-level VIP final builder fee rate (applies uniformly to all positions)
  const [vipMetamaskFeeRate, setVipMetamaskFeeRate] = useState<
    number | undefined
  >(undefined);

  // Freeze mechanism: Prevent recalculation on WebSocket updates (price changes)
  // Reset freeze when positions/account/VIP fee changes to allow recalculation
  const hasValidResultsRef = useRef(false);
  const hasValidVipFeesRef = useRef(false);

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

  // Fetch account-level VIP builder fee (applies uniformly to all positions)
  // Freeze mechanism prevents refetching when only positions change
  useEffect(() => {
    // Increment counter to invalidate any in-flight requests
    const currentFetchId = ++vipFeesFetchCounterRef.current;
    // Reset freeze when account changes (allow refetch for new account)
    hasValidVipFeesRef.current = false;

    async function fetchVipBuilderFees() {
      // Skip if already have valid VIP fee state for this account (freeze guard)
      if (hasValidVipFeesRef.current) {
        return;
      }

      if (!selectedAddress || !currentChainId) {
        // Only update state if this is still the latest fetch and component is mounted
        if (
          vipFeesFetchCounterRef.current === currentFetchId &&
          isComponentMountedRef.current
        ) {
          setVipMetamaskFeeRate(undefined);
          hasValidVipFeesRef.current = false;
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
            vipFeesFetchCounterRef.current === currentFetchId &&
            isComponentMountedRef.current
          ) {
            setVipMetamaskFeeRate(undefined);
            hasValidVipFeesRef.current = false;
          }
          return;
        }

        const vipFees =
          await Engine.context.RewardsController.getHyperliquidBuilderFeesForAccount(
            caipAccountId,
          );
        const vipBuilderFeeRate = parseVipBuilderFeeRate(vipFees);

        // Only update state if this is still the latest fetch and component is mounted
        if (
          vipFeesFetchCounterRef.current === currentFetchId &&
          isComponentMountedRef.current
        ) {
          setVipMetamaskFeeRate(vipBuilderFeeRate);
          hasValidVipFeesRef.current = true;
        }
      } catch (error) {
        console.warn('Failed to fetch VIP builder fees:', error);
        // Only update state if this is still the latest fetch and component is mounted
        if (
          vipFeesFetchCounterRef.current === currentFetchId &&
          isComponentMountedRef.current
        ) {
          setVipMetamaskFeeRate(undefined);
          hasValidVipFeesRef.current = false;
        }
      }
    }

    fetchVipBuilderFees().catch((error) => {
      console.error('Unhandled error in fetchVipBuilderFees:', error);
    });
  }, [selectedAddress, currentChainId]);

  // Per-position fee and rewards calculation
  // This ensures accurate coin-specific rewards calculation
  useEffect(() => {
    // Increment counter to invalidate any in-flight calculations
    const currentCalculationId = ++calculationCounterRef.current;
    // Reset freeze when meaningful inputs change (not price updates)
    // This MUST happen synchronously at effect start, before async function runs
    // Allows recalculation for: new positions, account switch, or VIP fee arrival
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
          // Note: Don't set vipMetamaskFeeRate here - would create infinite loop since it's in deps
          // The fetchVipBuilderFees effect is solely responsible for managing VIP fee state
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

              // Calculate base fees via PerpsController before VIP fee override
              const baseFees =
                await Engine.context.PerpsController.calculateFees({
                  orderType: 'market',
                  isMaker: false, // Market close orders are always taker
                  amount: positionValue.toString(),
                  symbol: pos.symbol,
                });

              const adjustedMetamaskFeeRate =
                baseFees.metamaskFeeRate !== undefined
                  ? (vipMetamaskFeeRate ?? baseFees.metamaskFeeRate)
                  : undefined;

              const adjustedMetamaskFeeAmount =
                adjustedMetamaskFeeRate !== undefined
                  ? positionValue * adjustedMetamaskFeeRate
                  : undefined;

              // Recalculate total fee amount and rate with final VIP builder fee applied
              const adjustedTotalFee =
                baseFees.protocolFeeAmount !== undefined &&
                adjustedMetamaskFeeAmount !== undefined
                  ? baseFees.protocolFeeAmount + adjustedMetamaskFeeAmount
                  : undefined;

              // Adjust total fee rate by replacing only the MetaMask component
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
                originalMetamaskFeeRate: baseFees.metamaskFeeRate,
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
                originalMetamaskFeeRate: undefined,
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
          originalMetamaskFeeRate: result.originalMetamaskFeeRate,
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
          // from triggering expensive points API calls. Reset happens on position/account/VIP fee change.
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
  }, [positions, selectedAddress, currentChainId, vipMetamaskFeeRate]);
  // Dependencies trigger freeze reset, allowing exactly one recalculation per change:
  // - positions: Recalculate when user opens/closes positions
  // - selectedAddress/currentChainId: Recalculate on account switch
  // - vipMetamaskFeeRate: Recalculate when VIP fee arrives from async fetch (happens once)
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
    let weightedOriginalMetamaskFeeRate = 0;
    let weightedProtocolFeeRate = 0;
    let totalWeight = 0;

    perPositionResults.forEach((result) => {
      const weight = result.fees.feeAmount ?? 0;
      if (
        weight > 0 &&
        result.fees.metamaskFeeRate !== undefined &&
        result.fees.protocolFeeRate !== undefined &&
        result.originalMetamaskFeeRate !== undefined
      ) {
        weightedMetamaskFeeRate += result.fees.metamaskFeeRate * weight;
        weightedOriginalMetamaskFeeRate +=
          result.originalMetamaskFeeRate * weight;
        weightedProtocolFeeRate += result.fees.protocolFeeRate * weight;
        totalWeight += weight;
      }
    });

    const avgMetamaskFeeRate =
      totalWeight > 0 ? weightedMetamaskFeeRate / totalWeight : undefined;
    const avgProtocolFeeRate =
      totalWeight > 0 ? weightedProtocolFeeRate / totalWeight : undefined;

    const avgOriginalMetamaskFeeRate =
      totalWeight > 0
        ? weightedOriginalMetamaskFeeRate / totalWeight
        : undefined;

    // Derive discount display from base fee versus VIP final fee
    const avgFeeDiscountPercentage = calculateFeeDiscountPercentage(
      avgOriginalMetamaskFeeRate,
      avgMetamaskFeeRate,
    );

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
  }, [perPositionResults]);

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
