import { useEffect } from 'react';
import { providerSupportsAsset } from '../utils/providerSupportsAsset';
import { useRampsProviders } from './useRampsProviders';

/**
 * Silently switches `RampsController.providers.selected` to the first
 * provider that supports `assetId` when the currently selected provider
 * does not.
 *
 * This mirrors the tier-1 silent-switch in UB2's BuildQuote (Effect 2) but
 * runs at the MMPay confirmation entry point so the downstream fiat
 * auto-selection hook always sees a compatible provider.
 *
 * No-op when:
 * - `assetId` is undefined
 * - no provider is selected yet (cold-start; RampsBootstrap handles that)
 * - the providers list is still loading (empty)
 * - the selected provider already supports the asset
 * - no alternative provider supports the asset (leaves current selection)
 */
export function useEnsureCompatibleProvider(assetId: string | undefined): void {
  const { providers, selectedProvider, setSelectedProvider } =
    useRampsProviders();

  useEffect(() => {
    if (!assetId || !selectedProvider || providers.length === 0) return;
    if (providerSupportsAsset(selectedProvider, assetId)) return;

    const compatible = providers.find(
      (p) => p.id !== selectedProvider.id && providerSupportsAsset(p, assetId),
    );
    if (compatible) {
      setSelectedProvider(compatible, { autoSelected: true });
    }
  }, [assetId, providers, selectedProvider, setSelectedProvider]);
}
