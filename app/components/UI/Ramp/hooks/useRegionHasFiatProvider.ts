import { type Provider } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';

/**
 * Whether the user's CURRENT region offers a usable on-ramp provider that
 * actually serves the given deposit asset, as decided by Ramps / Headless Buy
 * according to the active provider scope.
 *
 * The check mirrors RampsController's own provider matching: a provider serves
 * the asset when its `supportedCryptoCurrencies` map (keyed by CAIP-19 asset
 * id) contains the asset id, compared case-insensitively on both sides.
 * Providers without a `supportedCryptoCurrencies` map are treated as not
 * serving the asset.
 *
 * Scope `off` (production default) is native-only: the region must offer a
 * native provider (e.g. Transak Native) that serves the asset. This preserves
 * the pre-existing behavior shipped in MUSD-1075, so production is unchanged.
 *
 * Scope `in-app` / `all` (dev/RC only) treats the region as supported when any
 * provider (native or in-app WebView aggregator such as MoonPay, Banxa) serves
 * the asset; RampsController's scope-aware `getQuotes` performs the actual
 * in-app provider selection at quote time. Because eligibility is now
 * asset-aware, a region that lists providers none of which serve the deposit
 * asset (e.g. New York) correctly resolves to `false` instead of dead-ending
 * at quote time.
 *
 * Fails closed: an empty or missing `assetId` returns `false`.
 *
 * Unlike `useHasNativeFiatProvider`, which reflects the sticky selected
 * provider, this reads the provider list fetched for the active region, so it
 * correctly turns `false` in regions with no usable provider.
 *
 * @param assetId - CAIP-19 asset id of the deposit asset (e.g. mUSD-on-Monad).
 * @returns Whether the region has a provider serving the asset under scope.
 */
export function useRegionHasFiatProvider(assetId: string): boolean {
  const scope = useFiatProviderScope();
  const { providers } = useRampsProviders();

  if (!assetId) {
    return false;
  }

  const target = assetId.toLowerCase();
  const servesAsset = (provider: Provider): boolean => {
    const map = provider.supportedCryptoCurrencies;
    if (!map) {
      return false;
    }
    return Object.keys(map).some((key) => key.toLowerCase() === target);
  };

  if (
    providers.some(
      (provider) => provider.type === 'native' && servesAsset(provider),
    )
  ) {
    return true;
  }

  if (scope === 'off') {
    return false;
  }

  // Widened scope: the region counts as supported when any provider serves the
  // deposit asset. RampsController's scope-aware `getQuotes` performs the
  // precise in-app provider selection at quote time. Dev/RC only (production is
  // hard-off via `getEffectiveProviderScope`).
  return providers.some(servesAsset);
}

export default useRegionHasFiatProvider;
