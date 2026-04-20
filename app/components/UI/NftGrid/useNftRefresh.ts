import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../core/Engine';
import { useNftDetection } from '../../hooks/useNftDetection';
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

interface UseNftRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export const useNftRefresh = (): UseNftRefreshReturn => {
  const allEVMNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const { detectNfts } = useNftDetection();

  const [refreshing, setRefreshing] = useState(false);

  const allNetworkClientIds = useMemo(
    () =>
      Object.keys(tokenNetworkFilter).flatMap((chainId) => {
        const entry = allEVMNetworks[chainId as `0x${string}`];
        if (!entry) {
          return [];
        }
        const index = entry.defaultRpcEndpointIndex;
        const endpoint = entry.rpcEndpoints[index];
        return endpoint?.networkClientId ? [endpoint.networkClientId] : [];
      }),
    [tokenNetworkFilter, allEVMNetworks],
  );

  const onRefresh = useCallback(async () => {
    const { NftController } = Engine.context;

    setRefreshing(true);

    try {
      // Use useNftDetection.detectNfts which:
      // - Checks if NFT detection is enabled in user preferences
      // - Dispatches loading indicators
      // - Handles analytics tracking
      const detectNftsPromise = detectNfts();

      // Also update ownership status for all NFTs
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
