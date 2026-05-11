import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectChainId } from '../../../../selectors/networkController';

import { setMeasurement } from '@sentry/react-native';
import performance from 'react-native-performance';
import {
  EstimatePointsDto,
  EstimatedPointsDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  PerpsMeasurementName,
  PERFORMANCE_CONFIG,
  BUILDER_FEE_CONFIG,
  formatAccountToCaipAccountId,
  type HyperliquidBuilderFees,
} from '@metamask/perps-controller';
import { usePerpsTrading } from './usePerpsTrading';
import { determineMakerStatus } from '../utils/orderUtils';

// Cache for VIP builder fees to avoid repeated API calls
let vipBuilderFeeCache: {
  address: string;
  fees: HyperliquidBuilderFees | null;
  timestamp: number;
  ttl: number;
} | null = null;

// Enhanced cache for points calculation - stores everything needed to calculate locally
let pointsCalculationCache: {
  address: string;
  bonusBips: number | undefined;
  basePointsPerDollar: number; // Derived from first API call
  timestamp: number;
  ttl: number;
} | null = null;

/**
 * Fee calculation result with loading states
 */
export interface OrderFeesResult {
  /** Total fee in USD (protocol + MetaMask) */
  totalFee: number;
  /** Protocol trading fee in USD */
  protocolFee: number;
  /** MetaMask service fee in USD */
  metamaskFee: number;
  /** Protocol fee rate as decimal (e.g., 0.00045 for 0.045%) - undefined means unavailable/error state */
  protocolFeeRate: number | undefined;
  /** MetaMask fee rate as decimal (e.g., 0.01 for 1%) - undefined means unavailable/error state */
  metamaskFeeRate: number | undefined;
  /** Loading state for MetaMask fee (future API integration) */
  isLoadingMetamaskFee: boolean;
  /** Error state for fee calculation */
  error: string | null;
  /** Original MetaMask fee rate before any discounts - undefined means unavailable/error state */
  originalMetamaskFeeRate?: number;
  /** Fee discount percentage applied (e.g., 30 for 30% off) */
  feeDiscountPercentage?: number;
  /** Estimated points to be earned from this trade */
  estimatedPoints?: number;
  /** Bonus multiplier in basis points (100 = 1%) */
  bonusBips?: number;
}

interface UsePerpsOrderFeesParams {
  /** Order type - market or limit */
  orderType: 'market' | 'limit';
  /** Order amount in USD */
  amount: string;
  /** Symbol for the trade (e.g., 'BTC', 'ETH') */
  symbol?: string;
  /** Whether this is opening or closing a position */
  isClosing?: boolean;
  /** User's limit price */
  limitPrice?: string;
  /** Order direction */
  direction?: 'long' | 'short';
  /** Real ask price from L2 order book */
  currentAskPrice?: number;
  /** Real bid price from L2 order book */
  currentBidPrice?: number;
}

/**
 * Hook to calculate order fees (protocol + MetaMask)
 * Protocol-agnostic - each provider determines its own fee structure
 *
 * @param params Order parameters for fee calculation
 * @returns Fee calculation results with loading states
 */
/**
 * Clear all rewards-related caches
 * Useful when switching accounts or when caches need to be refreshed
 */
export function clearRewardsCaches(): void {
  vipBuilderFeeCache = null;
  pointsCalculationCache = null;
  DevLogger.log('Rewards: Cleared all caches');
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
  originalRate: number,
  adjustedRate: number,
): number | undefined {
  if (originalRate <= 0 || adjustedRate >= originalRate) {
    return undefined;
  }

  return ((originalRate - adjustedRate) / originalRate) * 100;
}

export function usePerpsOrderFees({
  orderType,
  amount,
  symbol = 'ETH',
  isClosing = false,
  limitPrice,
  direction,
  currentAskPrice,
  currentBidPrice,
}: UsePerpsOrderFeesParams): OrderFeesResult {
  const { calculateFees } = usePerpsTrading();
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const selectedAddress = evmAccount?.address;
  const currentChainId = useSelector(selectChainId);

  const isMaker = useMemo(() => {
    if (!direction) {
      return false;
    }

    return determineMakerStatus({
      orderType,
      limitPrice,
      direction,
      bestAsk: currentAskPrice,
      bestBid: currentBidPrice,
      symbol,
    });
  }, [
    orderType,
    limitPrice,
    direction,
    currentAskPrice,
    currentBidPrice,
    symbol,
  ]);

  // Clear stale cache on component mount to force fresh API call
  useEffect(() => {
    pointsCalculationCache = null;
  }, []);

  /**
   * Fetch VIP builder fees from RewardsController (non-blocking)
   */
  const fetchVipBuilderFees = useCallback(
    async (
      address: string,
    ): Promise<HyperliquidBuilderFees | null | undefined> => {
      // Check cache first
      const now = Date.now();
      if (
        vipBuilderFeeCache?.address === address &&
        now - vipBuilderFeeCache.timestamp < vipBuilderFeeCache.ttl
      ) {
        DevLogger.log('Rewards: Using cached VIP builder fees', {
          address,
          fees: vipBuilderFeeCache.fees,
          cacheAge:
            Math.round((now - vipBuilderFeeCache.timestamp) / 1000) + 's',
        });
        return vipBuilderFeeCache.fees;
      }

      try {
        const caipAccountId = formatAccountToCaipAccountId(
          address,
          currentChainId,
        );
        if (!caipAccountId) {
          return undefined;
        }

        DevLogger.log('Rewards: Fetching VIP builder fees via controller', {
          address,
          caipAccountId,
        });

        const { RewardsController } = Engine.context;
        const vipFeesStartTime = performance.now();
        const fees =
          await RewardsController.getHyperliquidBuilderFeesForAccount(
            caipAccountId,
          );
        const vipFeesDuration = performance.now() - vipFeesStartTime;

        // Measure VIP fees API call performance
        setMeasurement(
          PerpsMeasurementName.PerpsRewardsFeeDiscountApiCall,
          vipFeesDuration,
          'millisecond',
        );

        DevLogger.log('Rewards: VIP builder fees fetched via controller', {
          address,
          fees,
          duration: `${vipFeesDuration.toFixed(0)}ms`,
        });

        // Cache the response for configured duration, including null non-VIP state
        vipBuilderFeeCache = {
          address,
          fees,
          timestamp: Date.now(),
          ttl: PERFORMANCE_CONFIG.FeeDiscountCacheDurationMs,
        };

        return fees;
      } catch (error) {
        DevLogger.log(
          'Rewards: Error fetching VIP builder fees via controller',
          {
            error: error instanceof Error ? error.message : String(error),
            address,
          },
        );
        // Non-blocking - return undefined if fails
        return undefined;
      }
    },
    [currentChainId],
  );

  /**
   * Estimate points for the trade using RewardsController (non-blocking)
   */
  const estimatePoints = useCallback(
    async (
      address: string,
      tradeAmount: string,
      tradeCoin: string,
      isClose: boolean,
      actualFeeUSD?: number,
    ): Promise<EstimatedPointsDto | null> => {
      try {
        const amountNum = Number.parseFloat(tradeAmount || '0');
        if (amountNum <= 0) {
          return null;
        }

        const caipAccountId = formatAccountToCaipAccountId(
          address,
          currentChainId,
        );
        if (!caipAccountId) {
          return null;
        }

        // Use provided actual fee or calculate with base rate as fallback
        const estimatedFeeUSD = actualFeeUSD ?? amountNum * 0.001; // 0.1% = 10bps default

        const estimatePointsDto: EstimatePointsDto = {
          activityType: 'PERPS',
          account: caipAccountId,
          activityContext: {
            perpsContext: {
              type: isClose ? 'CLOSE_POSITION' : 'OPEN_POSITION',
              usdFeeValue: estimatedFeeUSD.toString(),
              coin: tradeCoin, // EstimatePerpsContextDto uses 'coin' field
            },
          },
        };

        DevLogger.log('Rewards: Points estimation request via controller', {
          estimatePointsDto,
          symbol: tradeCoin,
          size: amountNum,
          isClose,
        });

        const { RewardsController } = Engine.context;
        const pointsEstimationStartTime = performance.now();
        const result =
          await RewardsController.estimatePoints(estimatePointsDto);
        const pointsEstimationDuration =
          performance.now() - pointsEstimationStartTime;

        // Measure points estimation API call performance
        setMeasurement(
          PerpsMeasurementName.PerpsRewardsPointsEstimationApiCall,
          pointsEstimationDuration,
          'millisecond',
        );

        DevLogger.log('Rewards: Points estimated via controller', {
          pointsEstimate: result.pointsEstimate,
          bonusBips: result.bonusBips,
          symbol: tradeCoin,
          size: amountNum,
          isClose,
          duration: `${pointsEstimationDuration.toFixed(0)}ms`,
        });

        return result;
      } catch (error) {
        DevLogger.log('Rewards: Error estimating points via controller', {
          error: error instanceof Error ? error.message : String(error),
          symbol: tradeCoin,
          amount: tradeAmount,
        });
        // Non-blocking - return null if fails
        return null;
      }
    },
    [currentChainId],
  );

  // State for fees from provider
  const [protocolFeeRate, setProtocolFeeRate] = useState<number | undefined>(
    undefined,
  );
  const [metamaskFeeRate, setMetamaskFeeRate] = useState<number | undefined>(
    undefined,
  );
  const [originalMetamaskFeeRate, setOriginalMetamaskFeeRate] = useState<
    number | undefined
  >(undefined);
  const [totalFeeRate, setTotalFeeRate] = useState<number | undefined>(
    undefined,
  );
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for rewards data
  const [feeDiscountPercentage, setFeeDiscountPercentage] = useState<
    number | undefined
  >();
  const [estimatedPoints, setEstimatedPoints] = useState<number | undefined>();
  const [bonusBips, setBonusBips] = useState<number | undefined>();

  /**
   * Apply VIP builder fee and calculate actual rate.
   */
  const applyVipBuilderFee = useCallback(
    async (originalRate: number) => {
      if (!selectedAddress) {
        return { adjustedRate: originalRate, discountPercentage: undefined };
      }

      try {
        const vipBuilderFeeRate = parseVipBuilderFeeRate(
          await fetchVipBuilderFees(selectedAddress),
        );

        if (vipBuilderFeeRate !== undefined) {
          return {
            adjustedRate: vipBuilderFeeRate,
            discountPercentage: calculateFeeDiscountPercentage(
              originalRate,
              vipBuilderFeeRate,
            ),
          };
        }

        return { adjustedRate: originalRate, discountPercentage: undefined };
      } catch (vipFeeError) {
        DevLogger.log('Rewards: VIP builder fee calculation failed', {
          error:
            vipFeeError instanceof Error
              ? vipFeeError.message
              : String(vipFeeError),
        });
        return { adjustedRate: originalRate, discountPercentage: undefined };
      }
    },
    [fetchVipBuilderFees, selectedAddress],
  );

  /**
   * Handle points estimation with caching
   */
  const handlePointsEstimation = useCallback(
    async (
      userAddress: string,
      actualFeeUSD: number,
    ): Promise<{ points?: number; bonusBips?: number }> => {
      if (Number.parseFloat(amount) <= 0) {
        return {};
      }

      try {
        const now = Date.now();
        const cacheValid =
          pointsCalculationCache?.address === userAddress &&
          now - pointsCalculationCache.timestamp < pointsCalculationCache.ttl &&
          pointsCalculationCache.basePointsPerDollar > 0 &&
          Number.isFinite(pointsCalculationCache.basePointsPerDollar);

        if (cacheValid && pointsCalculationCache) {
          // Calculate points locally using cached data
          const basePoints =
            actualFeeUSD * pointsCalculationCache.basePointsPerDollar;
          const bonusMultiplier =
            1 + (pointsCalculationCache.bonusBips ?? 0) / 10000;
          const estimatedPointsValue = Math.round(basePoints * bonusMultiplier);

          DevLogger.log('Rewards: Calculating points locally with cache', {
            actualFeeUSD,
            basePointsPerDollar: pointsCalculationCache.basePointsPerDollar,
            bonusBips: pointsCalculationCache.bonusBips,
            bonusMultiplier,
            estimatedPoints: estimatedPointsValue,
            cacheAge:
              Math.round((now - pointsCalculationCache.timestamp) / 1000) + 's',
          });

          return {
            points: estimatedPointsValue,
            bonusBips: pointsCalculationCache.bonusBips,
          };
        }

        // Fetch from API and cache the results
        const pointsData = await estimatePoints(
          userAddress,
          amount,
          symbol,
          isClosing,
          actualFeeUSD,
        );

        if (pointsData?.pointsEstimate !== undefined && actualFeeUSD > 0) {
          // Calculate and cache the base points rate
          const bonusMultiplier = 1 + (pointsData.bonusBips ?? 0) / 10000;
          const denominator = actualFeeUSD * bonusMultiplier;
          const basePointsPerDollar =
            denominator > 0 ? pointsData.pointsEstimate / denominator : 0;

          if (Number.isFinite(basePointsPerDollar)) {
            pointsCalculationCache = {
              address: userAddress,
              bonusBips: pointsData.bonusBips,
              basePointsPerDollar,
              timestamp: now,
              ttl: PERFORMANCE_CONFIG.PointsCalculationCacheDurationMs,
            };

            DevLogger.log('Rewards: Cached points calculation parameters', {
              address: userAddress,
              bonusBips: pointsData.bonusBips,
              basePointsPerDollar,
              cacheExpiry: new Date(
                now + PERFORMANCE_CONFIG.PointsCalculationCacheDurationMs,
              ).toISOString(),
            });
          }

          return {
            points: pointsData.pointsEstimate,
            bonusBips: pointsData.bonusBips,
          };
        }

        return {};
      } catch (pointsError) {
        DevLogger.log('Rewards: Points estimation failed', {
          error:
            pointsError instanceof Error
              ? pointsError.message
              : String(pointsError),
          userAddress,
          amount,
        });
        return {};
      }
    },
    [amount, symbol, isClosing, estimatePoints],
  );

  /**
   * Update all fee-related state
   */
  const updateFeeState = useCallback(
    (
      protocolRate: number | undefined,
      originalMetamaskRate: number | undefined,
      adjustedMetamaskRate: number | undefined,
      discountPercentage?: number,
      points?: number,
      bonusBipsValue?: number,
    ) => {
      setProtocolFeeRate(protocolRate);
      setOriginalMetamaskFeeRate(originalMetamaskRate);
      setMetamaskFeeRate(adjustedMetamaskRate);
      // Only calculate total if both rates are defined (not undefined = error state)
      setTotalFeeRate(
        protocolRate !== undefined && adjustedMetamaskRate !== undefined
          ? protocolRate + adjustedMetamaskRate
          : undefined,
      );
      setFeeDiscountPercentage(discountPercentage);
      setEstimatedPoints(points);
      setBonusBips(bonusBipsValue);
    },
    [],
  );

  /**
   * Clear all fee-related state
   */
  const clearFeeState = useCallback((errorMessage?: string) => {
    if (errorMessage) {
      setError(errorMessage);
    }
    setProtocolFeeRate(0);
    setMetamaskFeeRate(0);
    setOriginalMetamaskFeeRate(0);
    setTotalFeeRate(0);
    setFeeDiscountPercentage(undefined);
    setEstimatedPoints(undefined);
    setBonusBips(undefined);
  }, []);

  // Main effect to orchestrate fee calculation
  useEffect(() => {
    let isComponentMounted = true;

    const fetchAllFeeData = async () => {
      try {
        setIsLoadingFees(true);
        setError(null);

        // Step 1: Get core fees from provider
        const coreFeesResult = await calculateFees({
          orderType,
          isMaker,
          amount,
          symbol,
        });

        if (!isComponentMounted) return;

        // Step 2: Check if rates are available (not undefined)
        // Undefined means error/unavailable state - UI will display "--" fallback
        if (
          coreFeesResult.metamaskFeeRate === undefined ||
          coreFeesResult.protocolFeeRate === undefined
        ) {
          // Rates unavailable - set all states to undefined for UI fallback display
          // UI will show FALLBACK_DATA_DISPLAY ('--') instead of misleading $0
          updateFeeState(
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );
          return;
        }

        // Step 3: Apply VIP builder fee if rewards are enabled (rates are guaranteed defined here)
        const { adjustedRate, discountPercentage } = await applyVipBuilderFee(
          coreFeesResult.metamaskFeeRate,
        );

        if (!isComponentMounted) return;

        // Step 4: Handle points estimation if user has address and valid amount
        let pointsResult: { points?: number; bonusBips?: number } = {};
        if (selectedAddress && Number.parseFloat(amount) > 0) {
          const actualFeeUSD = Number.parseFloat(amount) * adjustedRate;
          DevLogger.log('Rewards: Calculating points with VIP-adjusted fee', {
            originalRate: coreFeesResult.metamaskFeeRate,
            discountPercentage,
            adjustedRate,
            amount: Number.parseFloat(amount),
            actualFeeUSD,
          });

          pointsResult = await handlePointsEstimation(
            selectedAddress,
            actualFeeUSD,
          );
        }

        if (!isComponentMounted) return;

        // Step 5: Update all state with actual values (all rates are defined)
        updateFeeState(
          coreFeesResult.protocolFeeRate,
          coreFeesResult.metamaskFeeRate,
          adjustedRate,
          discountPercentage,
          pointsResult.points,
          pointsResult.bonusBips,
        );
      } catch (fetchError) {
        if (isComponentMounted) {
          const errorMessage =
            fetchError instanceof Error
              ? fetchError.message
              : 'Failed to fetch fees';
          clearFeeState(errorMessage);
        }
      } finally {
        if (isComponentMounted) {
          setIsLoadingFees(false);
        }
      }
    };

    fetchAllFeeData();

    return () => {
      isComponentMounted = false;
    };
  }, [
    orderType,
    isMaker,
    amount,
    symbol,
    calculateFees,
    applyVipBuilderFee,
    handlePointsEstimation,
    updateFeeState,
    clearFeeState,
    selectedAddress,
    currentChainId,
  ]);

  return useMemo(() => {
    const amountNum = Number.parseFloat(amount || '0');

    // Calculate fee amounts based on rates
    // If rates are undefined (unavailable/error state), fees are 0
    const protocolFee =
      protocolFeeRate !== undefined ? amountNum * protocolFeeRate : 0;
    const metamaskFee =
      metamaskFeeRate !== undefined ? amountNum * metamaskFeeRate : 0;
    const totalFee = totalFeeRate !== undefined ? amountNum * totalFeeRate : 0;

    return {
      totalFee,
      protocolFee,
      metamaskFee,
      protocolFeeRate,
      metamaskFeeRate,
      isLoadingMetamaskFee: isLoadingFees,
      error,
      // Rewards data
      originalMetamaskFeeRate,
      feeDiscountPercentage,
      estimatedPoints,
      bonusBips,
    };
  }, [
    amount,
    protocolFeeRate,
    metamaskFeeRate,
    totalFeeRate,
    isLoadingFees,
    error,
    originalMetamaskFeeRate,
    feeDiscountPercentage,
    estimatedPoints,
    bonusBips,
  ]);
}

/**
 * Format fee rate as percentage
 * @param rate Fee rate as decimal (e.g., 0.00045)
 * @returns Formatted percentage string (e.g., "0.045%") or "N/A" if invalid
 */
export function formatFeeRate(rate: number | undefined | null): string {
  if (rate === undefined || rate === null || Number.isNaN(rate)) {
    return 'N/A';
  }
  return `${(rate * 100).toFixed(3)}%`;
}
