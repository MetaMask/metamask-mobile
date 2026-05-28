import { useMemo } from 'react';
import { type Provider } from '@metamask/ramps-controller';
import { useRampsProviders } from '../../../../UI/Ramp/hooks/useRampsProviders';
import {
  RAMPS_PROVIDER_IDS,
  type RampsProviderId,
} from '../../../../UI/Ramp/constants/providerIds';

export interface UseFiatRouteProviderAvailabilityResult {
  /**
   * `true` when the target provider is in the providers list for the user's
   * current region; `false` once providers have loaded and the target is
   * absent. While loading the value defaults to `false` so callers can
   * combine it with `isLoading` to gate UX without flicker.
   */
  isAvailable: boolean;
  /** Mirrors the underlying providers query loading state. */
  isLoading: boolean;
  /** The matched provider, or `undefined` when unavailable. */
  provider: Provider | undefined;
}

/**
 * Availability check for a single Ramps provider, used by surfaces that are
 * hard-locked to one fiat route (e.g. Money Account v0, which only supports
 * Transak Native).
 *
 * This is intentionally narrow — it does not auto-select or switch providers.
 * Callers that need "pick the best available provider for an asset" semantics
 * should use {@link useEnsureProviderForAsset} instead.
 */
export function useFiatRouteProviderAvailability(
  targetProviderId: RampsProviderId = RAMPS_PROVIDER_IDS.TRANSAK_NATIVE,
): UseFiatRouteProviderAvailabilityResult {
  const { providers, isLoading } = useRampsProviders();

  return useMemo(() => {
    const provider = providers.find((p) => p.id === targetProviderId);
    return {
      isAvailable: Boolean(provider) && !isLoading,
      isLoading,
      provider,
    };
  }, [providers, isLoading, targetProviderId]);
}
