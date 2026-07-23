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
  const { providers } = useRampsProviders();

  return regionHasProviderForAsset({ providers, assetId, allProvidersEnabled });
}

export default useRegionHasFiatProvider;
