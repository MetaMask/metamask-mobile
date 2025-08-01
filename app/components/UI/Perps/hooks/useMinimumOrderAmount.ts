import { useMemo } from 'react';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';

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
    // Note: These are HyperLiquid-specific defaults
    // Future providers should implement their own defaults
    if (network === 'mainnet') {
      return 10; // $10 minimum for mainnet
    }

    return 11; // $11 minimum for testnet
  }, [marketData, network]);

  return {
    minimumOrderAmount,
    isLoading,
    error,
  };
}
