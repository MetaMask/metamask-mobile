import { isFiatDepositAvailable } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useHeadlessAllProvidersEnabled } from './useHeadlessAllProvidersEnabled';

/**
 * Returns whether headless fiat deposit (MM Pay / Money Account, Perps, Predict)
 * is available for the current region under the all-providers feature flag.
 *
 * The name is kept for its single consumer (`useIsFiatPaymentAvailable`). All of
 * the availability logic lives in `RampsController`'s shared
 * `isFiatDepositAvailable` helper, so this hook only wires the Redux-backed
 * provider list, selected provider, and flag boolean into it and cannot
 * disagree with the controller's own flag-aware provider pick. See that helper
 * for the flag-off native-only semantics.
 *
 * Read-only: never mutates provider selection or controller state, so it has no
 * effect on the standalone Buy flows.
 */
export function useHasNativeFiatProvider(): boolean {
  const allProvidersEnabled = useHeadlessAllProvidersEnabled();
  const { providers, selectedProvider } = useRampsProviders();

  return isFiatDepositAvailable({
    providers,
    selectedProvider,
    allProvidersEnabled,
  });
}

export default useHasNativeFiatProvider;
