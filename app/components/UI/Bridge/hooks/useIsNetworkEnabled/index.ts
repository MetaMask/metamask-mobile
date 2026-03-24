import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import {
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from '../../../../../selectors/networkEnablementController';

/**
 * Hook to check if a network is enabled
 * @param chainId - The chain ID to check (EVM hex or non-EVM CAIP format)
 * @returns Whether the network is enabled
 */
export const useIsNetworkEnabled = (chainId: string | undefined): boolean => {
  const evmEnabledNetworks = useSelector(selectEVMEnabledNetworks);
  const nonEvmEnabledNetworks = useSelector(selectNonEVMEnabledNetworks);

  return useMemo(() => {
    if (!chainId) return true; // No chainId = assume enabled

    if (isNonEvmChainId(chainId)) {
      return nonEvmEnabledNetworks.includes(chainId);
    }

    return evmEnabledNetworks.includes(chainId as Hex);
  }, [chainId, evmEnabledNetworks, nonEvmEnabledNetworks]);
};
