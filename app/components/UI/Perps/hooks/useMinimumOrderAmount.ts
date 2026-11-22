import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsProvider } from './usePerpsProvider';
import { type PerpsProviderType } from '@metamask/perps-controller';

interface UseMinimumOrderAmountParams {
  /** Asset symbol to get minimum order amount for */
  asset: string;
  /** Venue whose order limits apply; omitted uses the active route. */
  providerId?: PerpsProviderType;
}

interface UseMinimumOrderAmountReturn {
  /**
   * Minimum order amount in USD; undefined while it is unknown (capabilities
   * loading, or neither the venue nor the market reports one).
   */
  minimumOrderAmount: number | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Hook to get the minimum order amount for a specific asset.
 * Reads the venue's `orderLimits.minOrderNotionalUsd` from Core
 * `getOrderCapabilities`, then the market's own minimum. Never falls back to
 * another venue's default.
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

  const { orderCapabilities } = usePerpsProvider({ symbol: asset, providerId });
  const venueMinimumNotionalUsd =
    orderCapabilities?.status === 'ready'
      ? orderCapabilities.orderLimits?.minOrderNotionalUsd
      : undefined;

  return {
    minimumOrderAmount: venueMinimumNotionalUsd ?? marketData?.minimumOrderSize,
    isLoading,
    error,
  };
}
