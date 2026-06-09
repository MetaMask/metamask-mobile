import { useRampsProviders } from './useRampsProviders';

/**
 * Returns whether the fiat deposit flow will run on a NATIVE provider
 * (e.g. Transak Native).
 *
 * Headless fiat deposit (MM Pay / Money Account, Perps, Predict) is native-only
 * for v0. It is NOT enough for a native provider to merely exist in the region:
 * what matters is the PREFERRED provider that gets selected. The headless quote
 * auto-selects with `restrictToKnownOrNativeProviders`, but `RampsController`
 * resolves the currently selected provider first (see
 * `resolveProviderIdsForQuote`), so an aggregator preferred provider — carried
 * over from order history, or the aggregator `/providers/transak` matched by the
 * loose "transak" name check in `determinePreferredProvider` — would run a
 * non-native deposit experience.
 *
 * Therefore we gate on the selected (preferred) provider being native, and block
 * the flow whenever the preferred provider is an aggregator or none is native.
 *
 * Read-only — never mutates provider selection or controller state, so it has no
 * effect on the standalone Buy flows.
 */
export function useHasNativeFiatProvider(): boolean {
  const { selectedProvider } = useRampsProviders();
  return selectedProvider?.type === 'native';
}

export default useHasNativeFiatProvider;
