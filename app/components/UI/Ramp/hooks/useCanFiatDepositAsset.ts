import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectUserRegion } from '../../../../selectors/rampsController';
import Engine from '../../../../core/Engine';

/**
 * Hook to determine whether a fiat deposit can be initiated for a given asset
 * in the user's current region.
 *
 * Resolves the best provider for the asset via
 * `Engine.context.RampsController.getBestProviderForAsset`, wrapped in React
 * Query so the async result is cached and deduplicated across consumers.
 *
 * The query key matches `useRampsBuyLimits` so the provider result is shared
 * when both hooks are mounted for the same asset and region.
 *
 * Fails closed: returns `false` while loading, when the feature flag is off,
 * when `assetId` is not provided, or when no provider supports the asset in
 * the user's region.
 *
 * @param options.assetId - CAIP-19 asset identifier. When omitted the query is
 * disabled and the hook returns `false`.
 * @param options.isFiatDepositFlagEnabled - Feature flag controlling whether
 * fiat deposit is enabled at all.
 *
 * @returns `true` only when the flag is on, an assetId is present, and a
 * provider resolves for the asset in the user's region.
 */
export function useCanFiatDepositAsset({
  assetId,
  isFiatDepositFlagEnabled,
}: {
  assetId?: string;
  isFiatDepositFlagEnabled: boolean;
}): boolean {
  const userRegion = useSelector(selectUserRegion);

  const enabled = Boolean(isFiatDepositFlagEnabled && assetId);

  const { data: provider = null } = useQuery({
    queryKey: ['ramps', 'bestProvider', assetId, userRegion?.regionCode],
    queryFn: () =>
      Engine.context.RampsController.getBestProviderForAsset({
        assetId: assetId as string,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return enabled && provider != null;
}

export default useCanFiatDepositAsset;
