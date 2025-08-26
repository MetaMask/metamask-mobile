import { useSelector } from 'react-redux';
import { selectPerpsNetwork } from '../selectors/perpsController';

/**
 * Hook to get current network (testnet/mainnet)
 */
// TODO: Replace hook with selector in components.
export function usePerpsNetwork(): 'mainnet' | 'testnet' {
  return useSelector(selectPerpsNetwork);
}
