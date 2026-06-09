import { useRampsProviders } from './useRampsProviders';

/**
 * Returns whether the user's region has at least one NATIVE fiat on-ramp
 * provider (e.g. Transak Native).
 *
 * Headless fiat deposit (MM Pay / Money Account, Perps, Predict) is only
 * supported on native providers for v0, so consumers use this to gate the
 * fiat payment option where no native provider serves the region (e.g.
 * Brazil, which only exposes the aggregator). Read-only — it never mutates
 * provider selection or any controller state, so it has no effect on the
 * standalone Buy flows.
 */
export function useHasNativeFiatProvider(): boolean {
  const { providers } = useRampsProviders();
  return providers.some((provider) => provider.type === 'native');
}

export default useHasNativeFiatProvider;
