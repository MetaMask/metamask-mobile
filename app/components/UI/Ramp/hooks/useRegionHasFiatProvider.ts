import { regionHasProviderForAsset } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

/**
 * Whether the user's CURRENT region offers a usable on-ramp provider that
 * actually serves the given deposit asset, as decided by Ramps / Headless Buy
 * under the all-providers feature flag.
 *
 * All of the matching and flag logic lives in `RampsController`'s shared
 * `regionHasProviderForAsset` helper, so this hook only wires the Redux-backed
 * provider list and the flag boolean into it and cannot disagree with the
 * controller's own provider selection. See that helper for the asset-matching
 * and flag-off native-only semantics.
 *
 * @param assetId - CAIP-19 asset id of the deposit asset (e.g. mUSD-on-Monad).
 * @returns Whether the region has a provider serving the asset.
 */
export function useRegionHasFiatProvider(assetId: string): boolean {
  const allProvidersEnabled = useHeadlessAllProvidersEnabled();
  const { providers, isLoading } = useRampsProviders();

  // Providers are not persisted: every region switch clears the list to `[]`
  // and refetches, a window that can last several seconds on a cold switch.
  // Asserting "no provider" during that window hides the deposit entry even in
  // regions that do offer fiat (the reported New York "nothing shows when
  // adding funds" case, where providers only populated ~24s after the switch).
  // While widening is on, treat "still loading with nothing fetched yet" as
  // available so the entry survives the fetch, then let it resolve to the real
  // asset-aware answer once providers arrive. Gated on the flag so the
  // production native-only default keeps its exact current behavior.
  if (allProvidersEnabled && isLoading && providers.length === 0) {
    return true;
  }

  return regionHasProviderForAsset({ providers, assetId, allProvidersEnabled });
}

export default useRegionHasFiatProvider;
