import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsTrading } from './usePerpsTrading';
import Engine from '../../../../core/Engine';
import AppConstants from '../../../../core/AppConstants';
import { REWARDS_API_CONFIG } from '../constants/perpsConfig';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

// Cache for fee discount to avoid repeated API calls
let feeDiscountCache: {
  address: string;
  discountPercentage: number | undefined;
  tier: string | undefined;
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
 * Rewards API response types
 */
interface FeeDiscountResponse {
  discountPercentage?: number;
  tier?: string;
}

interface PointsEstimateResponse {
  points?: number;
  bonus?: number;
}

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
  /** User's rewards tier (e.g., 'tier-4-5' for 5bps discount) */
  rewardsTier?: string;
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
   * Fetch fee discount from rewards API (non-blocking)
   */
  const fetchFeeDiscount = useCallback(
    async (address: string): Promise<FeeDiscountResponse> => {
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
          tier: feeDiscountCache.tier,
          cacheAge: Math.round((now - feeDiscountCache.timestamp) / 1000) + 's',
        });
        return {
          discountPercentage: feeDiscountCache.discountPercentage,
          tier: feeDiscountCache.tier,
        };
      }

      try {
        const response = await fetch(
          `${AppConstants.REWARDS_API_URL}${REWARDS_API_CONFIG.FEE_DISCOUNT_ENDPOINT}/${address}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (!response.ok) {
          DevLogger.log('Rewards: Failed to fetch fee discount', {
            address,
            status: response.status,
          });
          return {};
        }

        const discountString = await response.text();
        DevLogger.log('Rewards: Fee discount fetched', {
          address,
          discountString,
        });

        // Parse the discount response
        // API returns format: "x,y" where x is the fee rate in bps
        // Example: "10,0" means 10bps fee rate
        // Example: "5,0" means 5bps fee rate (50% discount from base 10bps)
        // Example: "0,0" means no rewards enrollment or data
        const values = discountString.split(',').map((v) => v.trim());
        const userFeeRateBps = parseFloat(values[0] || '0');

        DevLogger.log('Rewards: Parsed fee discount', {
          rawResponse: discountString,
          parsedValues: values,
          userFeeRateBps,
        });

        let tier: string;
        let discountPercentage: number;

        // Calculate discount from base 10bps rate
        const baseFeeRateBps = 10;

        // Handle different fee rates including 0 (might indicate no rewards program enrollment)
        if (userFeeRateBps === 0 || isNaN(userFeeRateBps)) {
          // User might not be enrolled or API returned invalid data
          DevLogger.log('Rewards: No discount available', {
            userFeeRateBps,
            reason:
              userFeeRateBps === 0
                ? 'Not enrolled or base tier'
                : 'Invalid response',
          });
          // Return no discount
          tier = 'none';
          discountPercentage = 0;
        } else if (userFeeRateBps >= 10) {
          // Tiers 1-3: Pay full 10bps
          tier = 'tier-1-3';
          discountPercentage = 0; // No discount
        } else if (userFeeRateBps >= 5) {
          // Tiers 4-5: Pay 5bps (50% discount from 10bps)
          tier = 'tier-4-5';
          discountPercentage =
            ((baseFeeRateBps - userFeeRateBps) / baseFeeRateBps) * 100;
        } else if (userFeeRateBps >= 3.5) {
          // Tiers 6-7: Pay 3.5bps (65% discount from 10bps)
          tier = 'tier-6-7';
          discountPercentage =
            ((baseFeeRateBps - userFeeRateBps) / baseFeeRateBps) * 100;
        } else if (userFeeRateBps > 0) {
          // Some other discount rate
          tier = 'custom';
          discountPercentage =
            ((baseFeeRateBps - userFeeRateBps) / baseFeeRateBps) * 100;
        } else {
          // Fallback - should not reach here but TypeScript needs this
          tier = 'none';
          discountPercentage = 0;
        }

        DevLogger.log('Rewards: Calculated discount', {
          tier,
          userFeeRateBps,
          discountPercentage,
        });

        // Cache the discount for 30 minutes
        feeDiscountCache = {
          address,
          discountPercentage,
          tier,
          timestamp: Date.now(),
          ttl: 30 * 60 * 1000, // 30 minutes
        };

        return { discountPercentage, tier };
      } catch (error) {
        DevLogger.log('Rewards: Error fetching fee discount', {
          error: error instanceof Error ? error.message : 'Unknown error',
          address,
        });
        // Non-blocking - return empty if fails
        return {};
      }
    },
    [rewardsEnabled],
  );

  /**
   * Estimate points for the trade (non-blocking)
   */
  const estimatePoints = useCallback(
    async (
      address: string,
      tradeAmount: string,
      tradeCoin: string,
      isClose: boolean,
      actualFeeUSD?: number,
    ): Promise<PointsEstimateResponse> => {
      // Early return if feature flag is disabled - never make API call
      if (!rewardsEnabled) {
        return {};
      }

      try {
        const amountNum = parseFloat(tradeAmount || '0');
        if (amountNum <= 0) {
          return {};
        }

        // Use provided actual fee or calculate with base rate as fallback
        const estimatedFeeUSD = actualFeeUSD ?? amountNum * 0.001; // 0.1% = 10bps default

        // Note: API currently requires activityType: 'SWAP' even for perps
        // Both swapContext and perpsContext are needed per the API spec
        const requestBody = {
          activityType: 'SWAP', // Must be SWAP for now per API requirements
          account: `eip155:42161:${address}`, // Arbitrum chain ID for perps
          activityContext: {
            // Include minimal swapContext as required by API
            swapContext: {
              srcAsset: {
                id: 'eip155:42161/slip44:60', // ETH on Arbitrum
                amount: '0', // Not relevant for perps, but required field
              },
              destAsset: {
                id: 'eip155:42161/slip44:60', // ETH on Arbitrum
                amount: '0', // Not relevant for perps
              },
              feeAsset: {
                id: 'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
                amount: estimatedFeeUSD.toString(),
              },
            },
            // Perps-specific context
            perpsContext: {
              type: isClose ? 'CLOSE_POSITION' : 'OPEN_POSITION', // Uppercase per API spec
              usdFeeValue: estimatedFeeUSD.toString(),
              coin: tradeCoin,
              isBuy: !isClose,
              size: amountNum.toString(),
              orderType: 'market',
              price: '0', // Will be filled at market price
              reduceOnly: isClose,
              timeInForce: 'GTC',
              currentPrice: 0, // Not needed for estimation
            },
          },
        };

        const url = `${AppConstants.REWARDS_API_URL}${REWARDS_API_CONFIG.POINTS_ESTIMATE_ENDPOINT}`;
        DevLogger.log('Rewards: Points estimation request', {
          url,
          requestBody,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorBody = await response.text();
            errorDetails = errorBody;
          } catch {
            // Ignore if we can't read the error body
          }

          // Log the error but don't block the user experience
          DevLogger.log('Rewards: Failed to estimate points', {
            status: response.status,
            statusText: response.statusText,
            url,
            errorDetails,
          });

          // For 500 errors, it's a server issue - return empty gracefully
          // For 400 errors, it might be our request format - also handle gracefully
          // Points estimation is non-blocking, so we continue without points
          return {};
        }

        const data = await response.json();
        DevLogger.log('Rewards: Points estimated', {
          pointsEstimate: data.pointsEstimate,
          bonusBips: data.bonusBips,
          coin: tradeCoin,
          size: amountNum,
          isClose,
        });

        return {
          points: data.pointsEstimate,
          bonus: data.bonusBips,
        };
      } catch (error) {
        DevLogger.log('Rewards: Error estimating points', {
          error: error instanceof Error ? error.message : 'Unknown error',
          coin: tradeCoin,
          amount: tradeAmount,
        });
        // Non-blocking - return empty if fails
        return {};
      }
    },
    [rewardsEnabled],
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
  const [rewardsTier, setRewardsTier] = useState<string | undefined>();
  const [estimatedPoints, setEstimatedPoints] = useState<number | undefined>();
  const [bonusBips, setBonusBips] = useState<number | undefined>();

  // Fetch fees from provider (includes breakdown) and rewards data
  useEffect(() => {
    const fetchFees = async () => {
      try {
        setIsLoadingFees(true);
        setError(null);

        // Get fee breakdown from the active provider
        const result = await calculateFees({ orderType, isMaker, amount });

        // Provider returns complete breakdown
        setProtocolFeeRate(result.protocolFeeRate);
        setOriginalMetamaskFeeRate(result.metamaskFeeRate);

        // Initialize adjusted rate with original rate
        let adjustedMetamaskRate = result.metamaskFeeRate;

        // Only fetch rewards data if feature flag is enabled
        if (rewardsEnabled) {
          // Get user address for rewards API calls
          const userAddress = getUserAddress();

          // First fetch fee discount to know the actual fee rate
          const discountData = userAddress
            ? await fetchFeeDiscount(userAddress)
            : {};

          // Apply fee discount if available
          if (discountData.discountPercentage !== undefined) {
            const discount = discountData.discountPercentage / 100;
            adjustedMetamaskRate = result.metamaskFeeRate * (1 - discount);
            setFeeDiscountPercentage(discountData.discountPercentage);
            setRewardsTier(discountData.tier);
          } else {
            adjustedMetamaskRate = result.metamaskFeeRate;
            setFeeDiscountPercentage(undefined);
            setRewardsTier(undefined);
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
              pointsCalculationCache.basePointsPerDollar > 0;

            if (cacheValid && pointsCalculationCache) {
              // Calculate points locally using cached base rate and bonus
              const basePoints =
                actualFeeUSD * pointsCalculationCache.basePointsPerDollar;
              const bonusMultiplier =
                1 + (pointsCalculationCache.bonusBips ?? 0) / 10000;
              const estimatedPointsValue = Math.round(
                basePoints * bonusMultiplier,
              );

              DevLogger.log('Rewards: Calculating points locally with cache', {
                actualFeeUSD,
                basePointsPerDollar: pointsCalculationCache.basePointsPerDollar,
                bonusBips: pointsCalculationCache.bonusBips,
                bonusMultiplier,
                estimatedPoints: estimatedPointsValue,
                cacheAge:
                  Math.round((now - pointsCalculationCache.timestamp) / 1000) +
                  's',
              });

              setEstimatedPoints(estimatedPointsValue);
              setBonusBips(pointsCalculationCache.bonusBips);
            } else {
              // Fetch from API and derive the base rate for future calculations
              const pointsData = await estimatePoints(
                userAddress,
                amount,
                coin,
                isClosing,
                actualFeeUSD,
              );

              if (pointsData.points !== undefined && actualFeeUSD > 0) {
                setEstimatedPoints(pointsData.points);
                setBonusBips(pointsData.bonus);

                // Calculate the base points rate per dollar
                // Formula: points = feeUSD * baseRate * (1 + bonusBips/10000)
                // So: baseRate = points / (feeUSD * (1 + bonusBips/10000))
                const bonusMultiplier = 1 + (pointsData.bonus ?? 0) / 10000;
                const basePointsPerDollar =
                  pointsData.points / (actualFeeUSD * bonusMultiplier);

                // Cache the calculation parameters for future use
                pointsCalculationCache = {
                  address: userAddress,
                  bonusBips: pointsData.bonus,
                  basePointsPerDollar,
                  timestamp: now,
                  ttl: 30 * 60 * 1000, // Cache for 30 minutes
                };

                DevLogger.log('Rewards: Cached points calculation parameters', {
                  address: userAddress,
                  bonusBips: pointsData.bonus,
                  basePointsPerDollar,
                  derivedFrom: {
                    points: pointsData.points,
                    feeUSD: actualFeeUSD,
                    bonusMultiplier,
                  },
                  cacheExpiry: new Date(now + 30 * 60 * 1000).toISOString(),
                });
              } else {
                setEstimatedPoints(undefined);
                setBonusBips(undefined);
              }
            }
          } else {
            setEstimatedPoints(undefined);
            setBonusBips(undefined);
          }
        } else {
          // Feature flag disabled - clear all rewards data
          setFeeDiscountPercentage(undefined);
          setRewardsTier(undefined);
          setEstimatedPoints(undefined);
          setBonusBips(undefined);
        }

        setMetamaskFeeRate(adjustedMetamaskRate);
        setTotalFeeRate(result.protocolFeeRate + adjustedMetamaskRate);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch fees');
        // Reset all rates on error
        setProtocolFeeRate(0);
        setMetamaskFeeRate(0);
        setOriginalMetamaskFeeRate(0);
        setTotalFeeRate(0);
        setFeeDiscountPercentage(undefined);
        setRewardsTier(undefined);
        setEstimatedPoints(undefined);
        setBonusBips(undefined);
      } finally {
        setIsLoadingFees(false);
      }
    };

    fetchFees();
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
      rewardsTier,
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
    rewardsTier,
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
