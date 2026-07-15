import { useRampsProviders } from '../../Ramp/hooks/useRampsProviders';

/**
 * Whether the user's CURRENT region offers a native on-ramp provider
 * (e.g. Transak Native) for the headless fiat deposit flow.
 *
 * Unlike `useHasNativeFiatProvider`, which reflects the sticky *selected*
 * provider and stays `true` after the user moves to a region Transak does not
 * serve, this reads the provider list fetched for the active region, so it
 * correctly turns `false` in unsupported regions (e.g. Brazil).
 */
export function useRegionHasNativeFiatProvider(): boolean {
  const { providers } = useRampsProviders();
  return providers.some((provider) => provider.type === 'native');
}

export default useRegionHasNativeFiatProvider;
