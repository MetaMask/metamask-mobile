import { regionHasProviderForAsset } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';

/**
 * Whether the user's CURRENT region offers a usable on-ramp provider that
 * actually serves the given deposit asset, as decided by Ramps / Headless Buy
 * according to the active provider scope.
 *
 * All of the matching and scope logic lives in `RampsController`'s shared
 * `regionHasProviderForAsset` helper, so this hook only wires the Redux-backed
 * provider list and the effective scope into it and cannot disagree with the
 * controller's own provider selection. See that helper for the asset-matching
 * and scope-`off`-native-only semantics.
 *
 * @param assetId - CAIP-19 asset id of the deposit asset (e.g. mUSD-on-Monad).
 * @returns Whether the region has a provider serving the asset under scope.
 */
export function useRegionHasFiatProvider(assetId: string): boolean {
  const scope = useFiatProviderScope();
  const { providers } = useRampsProviders();

  return regionHasProviderForAsset({ providers, assetId, scope });
}

export default useRegionHasFiatProvider;
