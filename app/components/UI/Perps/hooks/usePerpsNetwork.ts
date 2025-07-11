import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';

const selectPerpsNetwork = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController?.isTestnet,
  (isTestnet): 'mainnet' | 'testnet' => (isTestnet ? 'testnet' : 'mainnet'),
);

/**
 * Hook to get current network (testnet/mainnet)
 */
export function usePerpsNetwork(): 'mainnet' | 'testnet' {
  return useSelector(selectPerpsNetwork);
}
