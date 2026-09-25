import { useQuery } from '@metamask/react-data-query';
import type { CaipAssetType } from '@metamask/utils';
import type { GetRecurringOrdersByAssetResponse } from '../api/recurringOrders.types';
import { recurringOrdersQueries } from '../queries/recurringOrders';

const EMPTY_ASSET_ID = 'eip155:0/slip44:0' satisfies CaipAssetType;

interface UseLatestOpenRecurringOrderForAssetParams {
  walletAddress?: string;
  assetId?: CaipAssetType | null;
  enabled?: boolean;
}

export function useLatestOpenRecurringOrderForAsset({
  walletAddress,
  assetId,
  enabled = true,
}: UseLatestOpenRecurringOrderForAssetParams) {
  const isEnabled = enabled && Boolean(walletAddress && assetId);
  const descriptor = recurringOrdersQueries.getRecurringOrdersByAsset({
    walletAddress: walletAddress ?? '',
    assetId: assetId ?? EMPTY_ASSET_ID,
  });
  const query = useQuery<GetRecurringOrdersByAssetResponse>({
    queryKey: descriptor.queryKey,
    enabled: isEnabled,
  });

  return {
    order:
      isEnabled && !query.isLoading && !query.isError
        ? query.data?.[0]
        : undefined,
    isLoading: isEnabled && query.isLoading,
    isError: isEnabled && query.isError,
  };
}
