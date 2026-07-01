import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';

/**
 * Returns whether headless fiat deposit (MM Pay / Money Account, Perps, Predict)
 * is available for the current region and provider-class scope.
 *
 * The name is kept for its single consumer (`useIsFiatPaymentAvailable`), but the
 * meaning is now scope-aware. Scope `off` (production, or the dev/RC toggle off)
 * keeps the native-only behaviour: a native provider must be the currently
 * selected (preferred) one, since `RampsController` resolves the selected
 * provider first and an aggregator preferred provider would otherwise run a
 * non-native deposit. Scope `in-app` / `all` make the flow available whenever the
 * region has any provider; `RampsController` widening performs the actual in-app
 * quote selection at quote time, so this gate must not depend on which single
 * provider is currently selected (it would disagree with core's pick).
 *
 * Read-only: never mutates provider selection or controller state, so it has no
 * effect on the standalone Buy flows.
 */
export function useHasNativeFiatProvider(): boolean {
  const scope = useFiatProviderScope();
  const { providers, selectedProvider } = useRampsProviders();

  if (selectedProvider?.type === 'native') {
    return true;
  }

  if (scope === 'off') {
    return false;
  }

  return providers.length > 0;
}

export default useHasNativeFiatProvider;
