import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectAllPopularNetworkConfigurations,
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../selectors/networkController';
import { Hex } from '@metamask/utils';

/**
 * Hook to determine the chains that should detect NFTs
 *
 * @returns an array of the chain ids allowed for NFTs search
 */
export const useNftDetectionChainIds = (): Hex[] => {
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetworks = useSelector(selectIsPopularNetwork);
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const chainId = useSelector(selectChainId);

  return useMemo(
    () =>
      isAllNetworks && isPopularNetworks
        ? (Object.values(networkConfigurationsPopularNetworks).map(
            (network) => network.chainId,
          ) as Hex[])
        : ([chainId] as Hex[]),
    [
      isAllNetworks,
      isPopularNetworks,
      networkConfigurationsPopularNetworks,
      chainId,
    ],
  );
};
