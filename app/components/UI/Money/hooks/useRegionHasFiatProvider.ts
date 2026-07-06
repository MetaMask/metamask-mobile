import { useRampsProviders } from '../../Ramp/hooks/useRampsProviders';
import { useFiatProviderScope } from '../../Ramp/utils/providerScope';

/**
 * Whether the user's CURRENT region offers a usable on-ramp provider for the
 * headless fiat deposit flow, as decided by Ramps / Headless Buy according to
 * the active provider scope.
 *
 * Scope `off` (production default) is native-only: the region must offer a
 * native provider (e.g. Transak Native). This preserves the pre-existing
 * behavior shipped in MUSD-1075, so production is unchanged.
 *
 * Scope `in-app` / `all` (dev/RC only) treats the region as supported when it
 * offers ANY provider, so in-app WebView aggregators (e.g. MoonPay, Banxa)
 * count too; RampsController's scope-aware `getQuotes` performs the actual
 * in-app provider selection at quote time.
 *
 * Unlike `useHasNativeFiatProvider`, which reflects the sticky selected
 * provider, this reads the provider list fetched for the active region, so it
 * correctly turns `false` in regions with no usable provider.
 */
export function useRegionHasFiatProvider(): boolean {
  const scope = useFiatProviderScope();
  const { providers } = useRampsProviders();

  if (providers.some((provider) => provider.type === 'native')) {
    return true;
  }

  if (scope === 'off') {
    return false;
  }

  // Widened scope: the region counts as supported when it offers any provider.
  // This intentionally over-approximates. A region offering only
  // external-browser (`IN_APP_OS_BROWSER`) or custom-action providers would
  // pass here but yield no in-app quote, since RampsController's
  // `#pickInAppQuote` filters those out; that surfaces as a graceful "no quote"
  // result, not a crash. Precise in-app eligibility is enforced at quote time,
  // and this mirrors `useHasNativeFiatProvider` so the entry and payment gates
  // agree. Dev/RC only (production is hard-off via `getEffectiveProviderScope`).
  return providers.length > 0;
}

export default useRegionHasFiatProvider;
