import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';

/**
 * Hook to get current network (testnet/mainnet)
 */
export function usePerpsNetwork(): 'mainnet' | 'testnet' {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.isTestnet ? 'testnet' : 'mainnet'
  );
}
