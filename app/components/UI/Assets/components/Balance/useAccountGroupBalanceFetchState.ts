import { useAssetsHaveLoaded } from '../../hooks/useAssetsHaveLoaded';

/**
 * Whether the selected account group's asset load has settled enough to show
 * balance (initial + background, latched across later refreshes on home).
 */
export function useAccountGroupBalanceFetchState(): boolean {
  return useAssetsHaveLoaded();
}
