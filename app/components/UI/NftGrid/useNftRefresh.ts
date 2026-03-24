import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import Engine from '../../../core/Engine';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

interface UseNftRefreshOptions {
  detectNfts: (firstPageOnly?: boolean) => Promise<void>;
  chainIdsToDetectNftsFor: Hex[];
}

interface UseNftRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export const useNftRefresh = ({
  detectNfts,
  chainIdsToDetectNftsFor,
}: UseNftRefreshOptions): UseNftRefreshReturn => {
  const allEVMNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);

  const [refreshing, setRefreshing] = useState(false);

  const allNetworkClientIds = useMemo(
    () =>
      chainIdsToDetectNftsFor.flatMap((chainId) => {
        const entry = allEVMNetworks[chainId as `0x${string}`];
        if (!entry) {
          return [];
        }
        const index = entry.defaultRpcEndpointIndex;
        const endpoint = entry.rpcEndpoints[index];
        return endpoint?.networkClientId ? [endpoint.networkClientId] : [];
      }),
    [chainIdsToDetectNftsFor, allEVMNetworks],
  );

  const onRefresh = useCallback(async () => {
    const { NftController } = Engine.context;

    setRefreshing(true);

    try {
      // detectNfts: checks if NFT detection is enabled, dispatches loading
      // indicators, and handles analytics tracking
      const detectNftsPromise = detectNfts();

      // Also update ownership status for all NFTs across all currently enabled networks
      const ownershipPromises = allNetworkClientIds.map((networkClientId) =>
        NftController.checkAndUpdateAllNftsOwnershipStatus(networkClientId),
      );

      await Promise.allSettled([detectNftsPromise, ...ownershipPromises]);
    } finally {
      setRefreshing(false);
    }
  }, [detectNfts, allNetworkClientIds]);

  return {
    refreshing,
    onRefresh,
  };
};
