import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectUserRegion } from '../../../../selectors/rampsController';
import Engine from '../../../../core/Engine';
import { useMoneyAccountFiatDepositAssetId } from './useMoneyAccountFiatDepositAssetId';

/**
 * Hook to determine whether a fiat deposit can be initiated for the
 * money-account deposit asset in the user's current region.
 *
 * The asset id is resolved from the `confirmations_pay_fiat.assetPerTransactionType`
 * LaunchDarkly flag (via `useMoneyAccountFiatDepositAssetId`), falling back to
 * native ETH on mainnet when the flag is absent. This matches core's
 * `getFiatAssetPerTransactionType` resolution order.
 *
 * Resolves the best provider for the asset via
 * `Engine.context.RampsController.getBestProviderForAsset`, wrapped in React
 * Query so the async result is cached and deduplicated across consumers.
 *
 * The query key matches `useRampsBuyLimits` so the provider result is shared
 * when both hooks are mounted for the same asset and region.
 *
 * Fails closed: returns `false` while loading, when the feature flag is off,
 * or when no provider supports the asset in the user's region.
 *
 * @param options.isFiatDepositFlagEnabled - Feature flag controlling whether
 * fiat deposit is enabled at all.
 *
 * @returns `true` only when the flag is on and a provider resolves for the
 * asset in the user's region.
 */
export function useCanFiatDepositAsset({
  isFiatDepositFlagEnabled,
}: {
  isFiatDepositFlagEnabled: boolean;
}): boolean {
  const assetId = useMoneyAccountFiatDepositAssetId();
  const userRegion = useSelector(selectUserRegion);

  const enabled = isFiatDepositFlagEnabled;

  const { data: provider = null } = useQuery({
    queryKey: ['ramps', 'bestProvider', assetId, userRegion?.regionCode],
    queryFn: () =>
      Engine.context.RampsController.getBestProviderForAsset({
        assetId,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return enabled && provider != null;
}

export default useCanFiatDepositAsset;
