import { useMemo } from 'react';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';

interface UseMinimumOrderAmountParams {
  /** Asset symbol to get minimum order amount for */
  asset: string;
}

interface UseMinimumOrderAmountReturn {
  /** Minimum order amount in USD */
  minimumOrderAmount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Hook to get the minimum order amount for a specific asset
 * Falls back to network-specific defaults if market data doesn't specify
 *
 * @param params Parameters containing the asset symbol
 * @returns Object containing minimum order amount and loading states
 */
export function useMinimumOrderAmount(
  params: UseMinimumOrderAmountParams,
): UseMinimumOrderAmountReturn {
  const { asset } = params;

  // Get market data which may contain minimum order size
  const { marketData, isLoading, error } = usePerpsMarketData(asset);

  // Get current network to determine fallback defaults
  const network = usePerpsNetwork();

  // Calculate minimum order amount with fallbacks
  const minimumOrderAmount = useMemo(() => {
    // First priority: Use market-specific minimum if available
    if (marketData?.minimumOrderSize !== undefined) {
      return marketData.minimumOrderSize;
    }

    // Fallback: Use network-specific defaults
    // Note: These match HyperLiquid's TRADING_DEFAULTS values
    // Future providers should implement their own defaults via protocol config
    if (network === 'mainnet') {
      return TRADING_DEFAULTS.amount.mainnet;
    }

    return TRADING_DEFAULTS.amount.testnet;
  }, [marketData, network]);

  return {
    minimumOrderAmount,
    isLoading,
    error,
  };
}
