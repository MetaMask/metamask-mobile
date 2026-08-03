import { useEffect } from 'react';
import { useRampsProviders } from './useRampsProviders';

/**
 * Silently switches `RampsController.providers.selected` to the first
 * provider that serves `assetId` when the currently selected provider does
 * not, by delegating to `RampsController:setSelectedProviderForAsset`.
 *
 * `providers` is kept in the dep array so the effect retries once providers
 * have loaded from the API. The controller method is a no-op if called while
 * providers are still empty, so the guard here and the internal guard are
 * consistent.
 *
 * No-op when `assetId` is undefined or providers have not loaded yet.
 */
export function useEnsureCompatibleProvider(assetId: string | undefined): void {
  const { providers, setSelectedProviderForAsset } = useRampsProviders();

  useEffect(() => {
    if (!assetId || providers.length === 0) return;
    setSelectedProviderForAsset(assetId, { autoSelected: true });
  }, [assetId, providers, setSelectedProviderForAsset]);
}
