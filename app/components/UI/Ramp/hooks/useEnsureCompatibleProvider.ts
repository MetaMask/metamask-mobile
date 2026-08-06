import { useEffect } from 'react';
import { getProvidersServingAsset } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

/**
 * Silently switches `RampsController.providers.selected` to a provider that can
 * actually serve a headless deposit of `assetId`, by delegating to
 * `RampsController:setSelectedProviderForAsset`.
 *
 * `providers` is kept in the dep array so the effect retries once providers
 * have loaded from the API. The controller method is a no-op if called while
 * providers are still empty, so the guard here and the internal guard are
 * consistent.
 *
 * While `moneyHeadlessAllProviders` is still rolling out, the controller's
 * asset-compatibility switch alone is not enough for the flag-off cohort:
 * `isFiatDepositAvailable` requires the *selected* provider to be native when
 * the flag is off, while `setSelectedProviderForAsset` is type-agnostic and
 * no-ops as soon as the current provider lists the asset. An aggregator that
 * serves the asset therefore satisfies the switch but still fails the
 * availability gate, hiding deposit in regions that do offer a native provider.
 * Reconcile the two here for the flag-off path only; the widened path keeps the
 * controller's decision as final. The flag-off branch is removed with the flag.
 *
 * No-op when `assetId` is undefined or providers have not loaded yet.
 */
export function useEnsureCompatibleProvider(assetId: string | undefined): void {
  const {
    providers,
    selectedProvider,
    setSelectedProvider,
    setSelectedProviderForAsset,
  } = useRampsProviders();
  const allProvidersEnabled = useHeadlessAllProvidersEnabled();

  useEffect(() => {
    if (!assetId || providers.length === 0) return;
    if (setSelectedProviderForAsset(assetId, { autoSelected: true })) return;
    if (allProvidersEnabled) return;
    if (selectedProvider?.type === 'native') return;

    const nativeProvider = getProvidersServingAsset(providers, assetId).find(
      (provider) => provider.type === 'native',
    );
    // Leaving the selection alone when no native provider serves the asset
    // matches `regionHasProviderForAsset`, which also reports the region as
    // unsupported while the flag is off.
    if (nativeProvider) {
      setSelectedProvider(nativeProvider, { autoSelected: true });
    }
  }, [
    assetId,
    providers,
    selectedProvider,
    setSelectedProvider,
    setSelectedProviderForAsset,
    allProvidersEnabled,
  ]);
}
