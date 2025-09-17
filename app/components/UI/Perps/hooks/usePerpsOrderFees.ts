import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsTrading } from './usePerpsTrading';
import Engine from '../../../../core/Engine';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectChainId } from '../../../../selectors/networkController';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  EstimatePointsDto,
  EstimatedPointsDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { DEVELOPMENT_CONFIG } from '../constants/perpsConfig';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';

// Cache for fee discount to avoid repeated API calls
let feeDiscountCache: {
  address: string;
  discountBips: number | undefined;
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
  /** Protocol fee rate as decimal (e.g., 0.00045 for 0.045%) */
  protocolFeeRate: number;
  /** MetaMask fee rate as decimal (e.g., 0.01 for 1%) */
  metamaskFeeRate: number;
  /** Loading state for MetaMask fee (future API integration) */
  isLoadingMetamaskFee: boolean;
  /** Error state for fee calculation */
  error: string | null;
  /** Original MetaMask fee rate before any discounts */
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
  /** Whether this is a maker order (for protocols that differentiate) */
  isMaker?: boolean;
  /** Coin symbol for the trade (e.g., 'BTC', 'ETH') */
  coin?: string;
  /** Whether this is opening or closing a position */
  isClosing?: boolean;
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
  feeDiscountCache = null;
  pointsCalculationCache = null;
  DevLogger.log('Rewards: Cleared all caches');
}

export function usePerpsOrderFees({
  orderType,
  amount,
  isMaker = false,
  coin = 'ETH',
  isClosing = false,
}: UsePerpsOrderFeesParams): OrderFeesResult {
  const { calculateFees } = usePerpsTrading();
  const rewardsEnabled = useSelector(selectRewardsEnabledFlag);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const currentChainId = useSelector(selectChainId);

  /**
   * Fetch fee discount from RewardsController (non-blocking)
   */
  const fetchFeeDiscount = useCallback(
    async (
      address: string,
    ): Promise<{ discountBips?: number; tier?: string }> => {
      // Early return if feature flag is disabled - never make API call
      if (!rewardsEnabled) {
        return {};
      }

      // Check cache first
      const now = Date.now();
      if (
        feeDiscountCache &&
        feeDiscountCache.address === address &&
        now - feeDiscountCache.timestamp < feeDiscountCache.ttl
      ) {
        DevLogger.log('Rewards: Using cached fee discount', {
          address,
          discountBips: feeDiscountCache.discountBips,
          cacheAge: Math.round((now - feeDiscountCache.timestamp) / 1000) + 's',
        });
        return {
          discountBips: feeDiscountCache.discountBips,
        };
      }

      try {
        const caipAccountId = formatAccountToCaipAccountId(
          address,
          currentChainId,
        );
        if (!caipAccountId) {
          return {};
        }

        DevLogger.log('Rewards: Fetching fee discount via controller', {
          address,
          caipAccountId,
        });

        const { RewardsController } = Engine.context;
        const discountBips = await RewardsController.getPerpsDiscountForAccount(
          caipAccountId,
        );

        DevLogger.log('Rewards: Fee discount bips fetched via controller', {
          address,
          discountBips,
        });

        // Cache the discount for 30 minutes
        feeDiscountCache = {
          address,
          discountBips,
          timestamp: Date.now(),
          ttl: 30 * 60 * 1000, // 30 minutes
        };

        return { discountBips };
      } catch (error) {
        DevLogger.log('Rewards: Error fetching fee discount via controller', {
          error: error instanceof Error ? error.message : String(error),
          address,
        });
        // Non-blocking - return empty if fails
        return {};
      }
    },
    [rewardsEnabled, currentChainId],
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
      // Early return if feature flag is disabled - never make API call
      if (!rewardsEnabled) {
        return null;
      }

      try {
        const amountNum = parseFloat(tradeAmount || '0');
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
              coin: tradeCoin,
            },
          },
        };

        DevLogger.log('Rewards: Points estimation request via controller', {
          estimatePointsDto,
          coin: tradeCoin,
          size: amountNum,
          isClose,
        });

        const { RewardsController } = Engine.context;
        const result = await RewardsController.estimatePoints(
          estimatePointsDto,
        );

        DevLogger.log('Rewards: Points estimated via controller', {
          pointsEstimate: result.pointsEstimate,
          bonusBips: result.bonusBips,
          coin: tradeCoin,
          size: amountNum,
          isClose,
        });

        return result;
      } catch (error) {
        DevLogger.log('Rewards: Error estimating points via controller', {
          error: error instanceof Error ? error.message : String(error),
          coin: tradeCoin,
          amount: tradeAmount,
        });
        // Non-blocking - return null if fails
        return null;
      }
    },
    [rewardsEnabled, currentChainId],
  );

  // State for fees from provider
  const [protocolFeeRate, setProtocolFeeRate] = useState(0);
  const [metamaskFeeRate, setMetamaskFeeRate] = useState(0);
  const [originalMetamaskFeeRate, setOriginalMetamaskFeeRate] = useState(0);
  const [totalFeeRate, setTotalFeeRate] = useState(0);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for rewards data
  const [feeDiscountPercentage, setFeeDiscountPercentage] = useState<
    number | undefined
  >();
  const [estimatedPoints, setEstimatedPoints] = useState<number | undefined>();
  const [bonusBips, setBonusBips] = useState<number | undefined>();

  /**
   * Apply fee discount and calculate actual rate
   */
  const applyFeeDiscount = useCallback(
    async (originalRate: number) => {
      if (!rewardsEnabled || !selectedAddress) {
        return { adjustedRate: originalRate, discountPercentage: undefined };
      }

      try {
        // Development-only simulation for testing fee discount UI
        const shouldSimulateFeeDiscount =
          __DEV__ &&
          parseFloat(amount) ===
            DEVELOPMENT_CONFIG.SIMULATE_FEE_DISCOUNT_AMOUNT;

        let discountData: { discountBips?: number };

        if (shouldSimulateFeeDiscount) {
          discountData = { discountBips: 2000 };
        } else {
          discountData = await fetchFeeDiscount(selectedAddress);
        }

        if (discountData.discountBips !== undefined) {
          // Validate discount doesn't exceed 100%
          const clampedDiscountBips = Math.min(
            discountData.discountBips,
            10000,
          );
          const percentage = clampedDiscountBips / 100;
          const discount = percentage / 100;
          const adjustedRate = originalRate * (1 - discount);
          return {
            adjustedRate,
            discountPercentage: percentage,
          };
        }

        return { adjustedRate: originalRate, discountPercentage: undefined };
      } catch (discountError) {
        DevLogger.log('Rewards: Fee discount calculation failed', {
          error:
            discountError instanceof Error
              ? discountError.message
              : String(discountError),
        });
        return { adjustedRate: originalRate, discountPercentage: undefined };
      }
    },
    [rewardsEnabled, fetchFeeDiscount, amount, selectedAddress],
  );

  /**
   * Handle points estimation with caching
   */
  const handlePointsEstimation = useCallback(
    async (
      userAddress: string,
      actualFeeUSD: number,
    ): Promise<{ points?: number; bonusBips?: number }> => {
      if (!rewardsEnabled || parseFloat(amount) <= 0) {
        return {};
      }

      try {
        const now = Date.now();
        const cacheValid =
          pointsCalculationCache &&
          pointsCalculationCache.address === userAddress &&
          now - pointsCalculationCache.timestamp < pointsCalculationCache.ttl &&
          pointsCalculationCache.basePointsPerDollar > 0 &&
          isFinite(pointsCalculationCache.basePointsPerDollar);

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
          coin,
          isClosing,
          actualFeeUSD,
        );

        if (pointsData?.pointsEstimate !== undefined && actualFeeUSD > 0) {
          // Calculate and cache the base points rate
          const bonusMultiplier = 1 + (pointsData.bonusBips ?? 0) / 10000;
          const denominator = actualFeeUSD * bonusMultiplier;
          const basePointsPerDollar =
            denominator > 0 ? pointsData.pointsEstimate / denominator : 0;

          if (isFinite(basePointsPerDollar)) {
            pointsCalculationCache = {
              address: userAddress,
              bonusBips: pointsData.bonusBips,
              basePointsPerDollar,
              timestamp: now,
              ttl: 30 * 60 * 1000,
            };

            DevLogger.log('Rewards: Cached points calculation parameters', {
              address: userAddress,
              bonusBips: pointsData.bonusBips,
              basePointsPerDollar,
              cacheExpiry: new Date(now + 30 * 60 * 1000).toISOString(),
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
    [rewardsEnabled, amount, coin, isClosing, estimatePoints],
  );

  /**
   * Update all fee-related state
   */
  const updateFeeState = useCallback(
    (
      protocolRate: number,
      originalMetamaskRate: number,
      adjustedMetamaskRate: number,
      discountPercentage?: number,
      points?: number,
      bonusBipsValue?: number,
    ) => {
      setProtocolFeeRate(protocolRate);
      setOriginalMetamaskFeeRate(originalMetamaskRate);
      setMetamaskFeeRate(adjustedMetamaskRate);
      setTotalFeeRate(protocolRate + adjustedMetamaskRate);
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
        });

        if (!isComponentMounted) return;

        // Step 2: Apply fee discount if rewards are enabled
        const { adjustedRate, discountPercentage } = await applyFeeDiscount(
          coreFeesResult.metamaskFeeRate,
        );

        if (!isComponentMounted) return;

        // Step 3: Handle points estimation if user has address and valid amount
        let pointsResult: { points?: number; bonusBips?: number } = {};
        if (selectedAddress && parseFloat(amount) > 0) {
          const actualFeeUSD = parseFloat(amount) * adjustedRate;
          DevLogger.log('Rewards: Calculating points with discounted fee', {
            originalRate: coreFeesResult.metamaskFeeRate,
            discountPercentage,
            adjustedRate,
            amount: parseFloat(amount),
            actualFeeUSD,
          });

          pointsResult = await handlePointsEstimation(
            selectedAddress,
            actualFeeUSD,
          );
        }

        if (!isComponentMounted) return;

        // Step 4: Update all state
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
    calculateFees,
    applyFeeDiscount,
    handlePointsEstimation,
    updateFeeState,
    clearFeeState,
    selectedAddress,
    currentChainId,
  ]);

  return useMemo(() => {
    const amountNum = parseFloat(amount || '0');

    // Calculate fee amounts based on rates
    const protocolFee = amountNum * protocolFeeRate;
    const metamaskFee = amountNum * metamaskFeeRate;
    const totalFee = amountNum * totalFeeRate;

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
  if (rate === undefined || rate === null || isNaN(rate)) {
    return 'N/A';
  }
  return `${(rate * 100).toFixed(3)}%`;
}
