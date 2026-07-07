import { isFiatDepositAvailable } from '@metamask/ramps-controller';
import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';

/**
 * Returns whether headless fiat deposit (MM Pay / Money Account, Perps, Predict)
 * is available for the current region and provider-class scope.
 *
 * The name is kept for its single consumer (`useIsFiatPaymentAvailable`). All of
 * the availability and scope logic lives in `RampsController`'s shared
 * `isFiatDepositAvailable` helper, so this hook only wires the Redux-backed
 * provider list, selected provider, and effective scope into it and cannot
 * disagree with the controller's own scope-aware provider pick. See that helper
 * for the scope-`off`-native-only semantics.
 *
 * Read-only: never mutates provider selection or controller state, so it has no
 * effect on the standalone Buy flows.
 */
export function useHasNativeFiatProvider(): boolean {
  const scope = useFiatProviderScope();
  const { providers, selectedProvider } = useRampsProviders();

  return isFiatDepositAvailable({ providers, selectedProvider, scope });
}

export default useHasNativeFiatProvider;
