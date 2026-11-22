import { useMemo } from 'react';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsProvider } from './usePerpsProvider';
import {
  TRADING_DEFAULTS,
  type PerpsProviderType,
} from '@metamask/perps-controller';

interface UseMinimumOrderAmountParams {
  /** Asset symbol to get minimum order amount for */
  asset: string;
  /** Venue whose order limits apply; omitted uses the active route. */
  providerId?: PerpsProviderType;
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
 * Hook to get the minimum order amount for a specific asset.
 * Reads the venue's `orderLimits.minOrderNotionalUsd` from Core
 * `getOrderCapabilities`, then market data, and falls back to the
 * network-specific defaults only when neither reports one.
 *
 * @param params Parameters containing the asset symbol
 * @returns Object containing minimum order amount and loading states
 */
export function useMinimumOrderAmount(
  params: UseMinimumOrderAmountParams,
): UseMinimumOrderAmountReturn {
  const { asset, providerId } = params;

  // Get market data which may contain minimum order size
  const { marketData, isLoading, error } = usePerpsMarketData(asset);

  // Get current network to determine fallback defaults
  const network = usePerpsNetwork();

  const { orderCapabilities } = usePerpsProvider({ symbol: asset, providerId });
  const venueMinimumNotionalUsd =
    orderCapabilities?.status === 'ready'
      ? orderCapabilities.orderLimits?.minOrderNotionalUsd
      : undefined;

  // Calculate minimum order amount with fallbacks
  const minimumOrderAmount = useMemo(() => {
    // First priority: the venue's reported minimum order value
    if (venueMinimumNotionalUsd !== undefined) {
      return venueMinimumNotionalUsd;
    }

    // Then a market-specific minimum if available
    if (marketData?.minimumOrderSize !== undefined) {
      return marketData.minimumOrderSize;
    }

    // Fallback when the venue reports no minimum: network-specific defaults
    if (network === 'mainnet') {
      return TRADING_DEFAULTS.amount.mainnet;
    }

    return TRADING_DEFAULTS.amount.testnet;
  }, [venueMinimumNotionalUsd, marketData, network]);

  return {
    minimumOrderAmount,
    isLoading,
    error,
  };
}
