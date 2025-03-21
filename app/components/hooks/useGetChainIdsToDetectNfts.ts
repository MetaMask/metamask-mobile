import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectAllPopularNetworkConfigurations,
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../selectors/networkController';
import { Hex } from '@metamask/utils';

export const useGetChainIdsToDetectNfts = (): Hex[] => {
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
