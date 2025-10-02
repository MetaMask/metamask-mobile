import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { useCurrentNetworkInfo } from './useCurrentNetworkInfo';

/**
 * Hook to determine the chains that should detect NFTs
 *
 * @returns an array of the chain ids allowed for NFTs search
 */
export const useNftDetectionChainIds = (): Hex[] => {
  const { enabledNetworks } = useCurrentNetworkInfo();

  const chainId = useSelector(selectChainId);

  return useMemo(
    () =>
      enabledNetworks.length >= 1
        ? (Object.values(enabledNetworks).map(
            (network) => network.chainId,
          ) as Hex[])
        : ([chainId] as Hex[]),
    [enabledNetworks, chainId],
  );
};
