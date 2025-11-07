import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { ImageSourcePropType } from 'react-native';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../util/networks';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../Deposit/constants/networks';

interface TokenNetworkInfo {
  networkName?: string;
  depositNetworkName: string | undefined;
  networkImageSource: ImageSourcePropType;
}

/**
 * Hook to get network information for a given chain ID
 * @returns Function that returns network name, deposit network name, and image source for a chain ID
 */
export function useTokenNetworkInfo() {
  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return useCallback(
    (chainId: CaipChainId): TokenNetworkInfo => {
      const networkName = allNetworkConfigurations[chainId]?.name;
      const depositNetworkName = DEPOSIT_NETWORKS_BY_CHAIN_ID[chainId]?.name;
      const networkImageSource = getNetworkImageSource({ chainId });

      return {
        networkName,
        depositNetworkName,
        networkImageSource,
      };
    },
    [allNetworkConfigurations],
  );
}
