import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getOrders } from '../../../../reducers/fiatOrders';
import { selectProviders } from '../../../../selectors/rampsController';
import { determinePreferredProvider } from '../utils/determinePreferredProvider';
import { useRampsPreferredProvider } from './useRampsPreferredProvider';

/**
 * Hook that automatically sets the preferred provider based on user's order history
 * and available providers. This hook watches for changes in orders and providers,
 * and updates the preferred provider accordingly.
 *
 * The preferred provider is determined by:
 * 1. Most recent completed order's provider (if available in providers list)
 * 2. Transak (if no orders or provider from order not found)
 * 3. First provider in list (if Transak not available)
 *
 * This hook should be used in components that need to automatically manage
 * the preferred provider state.
 */
export function useRampsPreferredProviderAutoSet(): void {
  const orders = useSelector(getOrders);
  const providers = useSelector(selectProviders);
  const { setPreferredProvider, preferredProvider } =
    useRampsPreferredProvider();

  useEffect(() => {
    if (providers.length === 0) {
      return;
    }

    const determinedProvider = determinePreferredProvider(orders, providers);

    if (determinedProvider) {
      const currentProviderId = preferredProvider?.id?.toLowerCase();
      const determinedProviderId = determinedProvider.id?.toLowerCase();

      if (currentProviderId !== determinedProviderId) {
        setPreferredProvider(determinedProvider);
      }
    }
  }, [orders, providers, setPreferredProvider, preferredProvider]);
}

export default useRampsPreferredProviderAutoSet;
