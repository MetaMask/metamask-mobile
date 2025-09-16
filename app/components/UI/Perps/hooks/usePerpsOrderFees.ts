import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsTrading } from './usePerpsTrading';
import Engine from '../../../../core/Engine';
import { toCaipAccountId, CaipAccountId } from '@metamask/utils';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  EstimatePointsDto,
  EstimatedPointsDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { DEVELOPMENT_CONFIG } from '../constants/perpsConfig';

// Cache for fee discount to avoid repeated API calls
let feeDiscountCache: {
  address: string;
  discountPercentage: number | undefined;
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

  /**
   * Helper function to get current user's EVM address
   */
  const getUserAddress = useCallback((): string | null => {
    try {
      const { AccountTreeController } = Engine.context;
      const accounts =
        AccountTreeController.getAccountsFromSelectedAccountGroup();
      const evmAccount = accounts.find(
        (account: { type: string; address: string }) =>
          account.type.startsWith('eip155:'),
      );
      return evmAccount?.address || null;
    } catch (error) {
      return null;
    }
  }, []);

  /**
   * Helper function to format address to CAIP-10 format for Arbitrum
   */
  const formatAccountToCaipAccountId = useCallback(
    (address: string): CaipAccountId | null => {
      try {
        return toCaipAccountId('eip155', '42161', address);
      } catch (error) {
        DevLogger.log('Rewards: Failed to format CAIP Account ID', {
          address,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [],
  );

  /**
   * Fetch fee discount from RewardsController (non-blocking)
   */
  const fetchFeeDiscount = useCallback(
    async (
      address: string,
    ): Promise<{ discountPercentage?: number; tier?: string }> => {
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
          discountPercentage: feeDiscountCache.discountPercentage,
          cacheAge: Math.round((now - feeDiscountCache.timestamp) / 1000) + 's',
        });
        return {
          discountPercentage: feeDiscountCache.discountPercentage,
        };
      }

      try {
        const caipAccountId = formatAccountToCaipAccountId(address);
        if (!caipAccountId) {
          return {};
        }

        DevLogger.log('Rewards: Fetching fee discount via controller', {
          address,
          caipAccountId,
        });

        const discountPercentage = await Engine.controllerMessenger.call(
          'RewardsController:getPerpsDiscountForAccount',
          caipAccountId,
        );

        DevLogger.log('Rewards: Fee discount fetched via controller', {
          address,
          discountPercentage,
        });

        // Cache the discount for 30 minutes
        feeDiscountCache = {
          address,
          discountPercentage,
          timestamp: Date.now(),
          ttl: 30 * 60 * 1000, // 30 minutes
        };

        return { discountPercentage };
      } catch (error) {
        DevLogger.log('Rewards: Error fetching fee discount via controller', {
          error: error instanceof Error ? error.message : String(error),
          address,
        });
        // Non-blocking - return empty if fails
        return {};
      }
    },
    [rewardsEnabled, formatAccountToCaipAccountId],
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

        const caipAccountId = formatAccountToCaipAccountId(address);
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

        const result = await Engine.controllerMessenger.call(
          'RewardsController:estimatePoints',
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
    [rewardsEnabled, formatAccountToCaipAccountId],
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

  // Fetch fees from provider (includes breakdown) and rewards data
  useEffect(() => {
    let isComponentMounted = true;

    const fetchFees = async () => {
      try {
        setIsLoadingFees(true);
        setError(null);

        // Get fee breakdown from the active provider - this is the core fee calculation
        const result = await calculateFees({ orderType, isMaker, amount });

        if (!isComponentMounted) return;

        // Provider returns complete breakdown
        setProtocolFeeRate(result.protocolFeeRate);
        setOriginalMetamaskFeeRate(result.metamaskFeeRate);

        // Initialize adjusted rate with original rate
        let adjustedMetamaskRate = result.metamaskFeeRate;

        // Only fetch rewards data if feature flag is enabled
        if (rewardsEnabled) {
          try {
            // Get user address for rewards API calls
            const userAddress = getUserAddress();

            // Development-only simulation for testing fee discount UI
            // Amount "41": Triggers 20% fee discount to test discount display
            const shouldSimulateFeeDiscount =
              __DEV__ &&
              parseFloat(amount) ===
                DEVELOPMENT_CONFIG.SIMULATE_FEE_DISCOUNT_AMOUNT;

            let discountData: { discountPercentage?: number } = {};

            if (shouldSimulateFeeDiscount) {
              // Simulate 20% fee discount for development testing
              discountData = {
                discountPercentage: 20,
              };
            } else {
              // First fetch fee discount to know the actual fee rate
              discountData = userAddress
                ? await fetchFeeDiscount(userAddress)
                : {};
            }

            if (!isComponentMounted) return;

            // Apply fee discount if available
            if (discountData.discountPercentage !== undefined) {
              const discount = discountData.discountPercentage / 100;
              adjustedMetamaskRate = result.metamaskFeeRate * (1 - discount);
              setFeeDiscountPercentage(discountData.discountPercentage);
            } else {
              adjustedMetamaskRate = result.metamaskFeeRate;
              setFeeDiscountPercentage(undefined);
            }

            // Now estimate points using the ACTUAL discounted fee
            if (userAddress && amount && parseFloat(amount) > 0) {
              const amountNum = parseFloat(amount);
              // Calculate the actual fee that will be charged (after discount)
              const actualFeeUSD = amountNum * adjustedMetamaskRate;

              DevLogger.log('Rewards: Calculating points with discounted fee', {
                originalRate: result.metamaskFeeRate,
                discountPercentage: discountData.discountPercentage,
                adjustedRate: adjustedMetamaskRate,
                amount: amountNum,
                actualFeeUSD,
              });

              // Check if we have valid cached points calculation data
              const now = Date.now();
              const cacheValid =
                pointsCalculationCache &&
                pointsCalculationCache.address === userAddress &&
                now - pointsCalculationCache.timestamp <
                  pointsCalculationCache.ttl &&
                pointsCalculationCache.basePointsPerDollar > 0 &&
                isFinite(pointsCalculationCache.basePointsPerDollar);

              if (cacheValid && pointsCalculationCache) {
                // Calculate points locally using cached base rate and bonus
                const basePoints =
                  actualFeeUSD * pointsCalculationCache.basePointsPerDollar;
                const bonusMultiplier =
                  1 + (pointsCalculationCache.bonusBips ?? 0) / 10000;
                const estimatedPointsValue = Math.round(
                  basePoints * bonusMultiplier,
                );

                DevLogger.log(
                  'Rewards: Calculating points locally with cache',
                  {
                    actualFeeUSD,
                    basePointsPerDollar:
                      pointsCalculationCache.basePointsPerDollar,
                    bonusBips: pointsCalculationCache.bonusBips,
                    bonusMultiplier,
                    estimatedPoints: estimatedPointsValue,
                    cacheAge:
                      Math.round(
                        (now - pointsCalculationCache.timestamp) / 1000,
                      ) + 's',
                  },
                );

                if (isComponentMounted) {
                  setEstimatedPoints(estimatedPointsValue);
                  setBonusBips(pointsCalculationCache.bonusBips);
                }
              } else {
                try {
                  // Fetch from API and derive the base rate for future calculations
                  const pointsData = await estimatePoints(
                    userAddress,
                    amount,
                    coin,
                    isClosing,
                    actualFeeUSD,
                  );

                  if (!isComponentMounted) return;

                  if (
                    pointsData?.pointsEstimate !== undefined &&
                    actualFeeUSD > 0
                  ) {
                    setEstimatedPoints(pointsData.pointsEstimate);
                    setBonusBips(pointsData.bonusBips);

                    // Calculate the base points rate per dollar
                    // Formula: points = feeUSD * baseRate * (1 + bonusBips/10000)
                    // So: baseRate = points / (feeUSD * (1 + bonusBips/10000))
                    const bonusMultiplier =
                      1 + (pointsData.bonusBips ?? 0) / 10000;
                    const denominator = actualFeeUSD * bonusMultiplier;
                    const basePointsPerDollar =
                      denominator > 0
                        ? pointsData.pointsEstimate / denominator
                        : 0;

                    // Only cache finite values
                    if (isFinite(basePointsPerDollar)) {
                      // Cache the calculation parameters for future use
                      pointsCalculationCache = {
                        address: userAddress,
                        bonusBips: pointsData.bonusBips,
                        basePointsPerDollar,
                        timestamp: now,
                        ttl: 30 * 60 * 1000, // Cache for 30 minutes
                      };

                      DevLogger.log(
                        'Rewards: Cached points calculation parameters',
                        {
                          address: userAddress,
                          bonusBips: pointsData.bonusBips,
                          basePointsPerDollar,
                          derivedFrom: {
                            pointsEstimate: pointsData.pointsEstimate,
                            feeUSD: actualFeeUSD,
                            bonusMultiplier,
                          },
                          cacheExpiry: new Date(
                            now + 30 * 60 * 1000,
                          ).toISOString(),
                        },
                      );
                    }
                  } else {
                    setEstimatedPoints(undefined);
                    setBonusBips(undefined);
                  }
                } catch (pointsError) {
                  // Points estimation failed, but don't affect core fees
                  DevLogger.log('Rewards: Points estimation failed', {
                    error:
                      pointsError instanceof Error
                        ? pointsError.message
                        : String(pointsError),
                    userAddress,
                    amount,
                  });
                  if (isComponentMounted) {
                    setEstimatedPoints(undefined);
                    setBonusBips(undefined);
                  }
                }
              }
            } else {
              setEstimatedPoints(undefined);
              setBonusBips(undefined);
            }
          } catch (rewardsError) {
            // Rewards API failed, but don't affect core fees
            DevLogger.log('Rewards: Fee discount fetch failed', {
              error:
                rewardsError instanceof Error
                  ? rewardsError.message
                  : String(rewardsError),
            });
            if (isComponentMounted) {
              // Clear rewards data but keep original fee rate
              adjustedMetamaskRate = result.metamaskFeeRate;
              setFeeDiscountPercentage(undefined);
              setEstimatedPoints(undefined);
              setBonusBips(undefined);
            }
          }
        } else {
          // Feature flag disabled - clear all rewards data
          setFeeDiscountPercentage(undefined);
          setEstimatedPoints(undefined);
          setBonusBips(undefined);
        }

        if (isComponentMounted) {
          setMetamaskFeeRate(adjustedMetamaskRate);
          setTotalFeeRate(result.protocolFeeRate + adjustedMetamaskRate);
        }
      } catch (err) {
        // Core fee calculation failed - this is a critical error
        if (isComponentMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch fees');
          // Reset only core fee rates on core calculation error
          setProtocolFeeRate(0);
          setMetamaskFeeRate(0);
          setOriginalMetamaskFeeRate(0);
          setTotalFeeRate(0);
          // Also clear rewards data since we can't calculate discounts without base rates
          setFeeDiscountPercentage(undefined);
          setEstimatedPoints(undefined);
          setBonusBips(undefined);
        }
      } finally {
        if (isComponentMounted) {
          setIsLoadingFees(false);
        }
      }
    };

    fetchFees();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isComponentMounted = false;
    };
  }, [
    orderType,
    isMaker,
    amount,
    calculateFees,
    coin,
    isClosing,
    rewardsEnabled,
    getUserAddress,
    fetchFeeDiscount,
    estimatePoints,
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
