import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';

import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import Logger from '../../../util/Logger';
import { PopularList } from '../../../util/networks/customNetworks';
import type { Network } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { useAddPopularNetwork } from '../useAddPopularNetwork';

/**
 * Internal helper: adds a vetted PopularList network if the chain is missing.
 */
const useAddNetworkIfMissing = () => {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const { addPopularNetwork } = useAddPopularNetwork();

  return useCallback(
    async (chainId?: string): Promise<Network | null> => {
      const popularNetwork = PopularList.find(
        (network) => network.chainId === chainId,
      );

      if (!popularNetwork || evmNetworkConfigurations[chainId as Hex]) {
        return null;
      }

      await addPopularNetwork(popularNetwork);

      return popularNetwork;
    },
    [addPopularNetwork, evmNetworkConfigurations],
  );
};

/**
 * User-triggered add for a missing vetted network; failures are logged, not thrown.
 * Gate follow-up actions on `onSuccess`.
 * @returns mutation to attempt add missing popular network
 */
export const useAddNetworkIfMissingMutation = (): UseMutationResult<
  Network | null,
  Error,
  string | undefined
> => {
  const addNetworkIfMissing = useAddNetworkIfMissing();

  return useMutation<Network | null, Error, string | undefined>({
    mutationFn: addNetworkIfMissing,
    onError: (error, chainId) =>
      Logger.error(error, {
        message: 'Failed to add missing network',
        chainId,
      }),
  });
};

/**
 * Auto-adds a missing vetted network on mount (e.g. deeplinked Token Details).
 * Pass `enabled: false` to defer until ready.
 * @returns query to attempt add missing popular network
 */
export const useAddNetworkIfMissingQuery = ({
  chainId,
  enabled = true,
}: {
  chainId?: string;
  enabled?: boolean;
}): UseQueryResult<Network | null, Error> => {
  const addNetworkIfMissing = useAddNetworkIfMissing();

  return useQuery<Network | null, Error>({
    queryKey: ['add-network-if-missing', chainId ?? null],
    queryFn: () => addNetworkIfMissing(chainId),
    enabled,
    // A write rather than a refetchable read: a chain that needs no add
    // resolves with `null` and leaves the network list untouched, so the only
    // way it runs again is re-entering the screen once the cache has expired.
    retry: false,
    refetchOnWindowFocus: false,
    onError: (error) =>
      Logger.error(error, {
        message: 'Failed to auto-add missing network',
        chainId,
      }),
  });
};
