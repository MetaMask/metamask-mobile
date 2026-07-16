import { isFiatDepositAvailable } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

/**
 * Returns whether headless fiat deposit (MM Pay / Money Account, Perps, Predict)
 * is available for the current region.
 *
 * All of the availability logic lives in `RampsController`'s shared
 * `isFiatDepositAvailable` helper, so this hook only wires the Redux-backed
 * provider list, selected provider, and the `moneyHeadlessAllProviders` flag
 * into it and cannot disagree with the controller's own flag-aware provider
 * pick. The result is not native-only: when the flag is off it is (a native
 * selected provider), but when the flag is on any provider class counts
 * (aggregator, external-browser / custom-action such as PayPal or Coinbase).
 * See that helper for the exact semantics.
 *
 * Read-only: never mutates provider selection or controller state, so it has no
 * effect on the standalone Buy flows.
 */
export function useHasFiatProvider(): boolean {
  const allProvidersEnabled = useHeadlessAllProvidersEnabled();
  const { providers, selectedProvider } = useRampsProviders();

  return isFiatDepositAvailable({
    providers,
    selectedProvider,
    allProvidersEnabled,
  });
}

export default useHasFiatProvider;
