import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { cloneDeep } from 'lodash';
import { Nft } from '@metamask/assets-controllers';

import Engine from '../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { useNftDetectionChainIds } from '../../hooks/useNftDetectionChainIds';
import { prepareNftDetectionEvents } from '../../../util/assets';
import { getDecimalChainId } from '../../../util/networks';
import Logger from '../../../util/Logger';
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

interface UseNftRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export const useNftRefresh = (): UseNftRefreshReturn => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const allEVMNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const chainIdsToDetectNftsFor = useNftDetectionChainIds();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [refreshing, setRefreshing] = useState(false);

  const getNftDetectionAnalyticsParams = useCallback((nft: Nft) => {
    try {
      return {
        chain_id: getDecimalChainId(nft.chainId),
        source: 'detected' as const,
      };
    } catch (error) {
      Logger.error(
        error as Error,
        'useNftRefresh.getNftDetectionAnalyticsParams',
      );
      return undefined;
    }
  }, []);

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
    // Return early if no address selected
    if (!selectedAddress) return;

    // Get initial state of NFTs before refresh
    const { NftDetectionController, NftController } = Engine.context;
    const previousNfts = cloneDeep(
      NftController.state.allNfts[selectedAddress.toLowerCase()],
    );
    trace({ name: TraceName.DetectNfts });

    setRefreshing(true);

    const actions = [
      NftDetectionController.detectNfts(chainIdsToDetectNftsFor),
    ];

    allNetworkClientIds.forEach((networkClientId) => {
      actions.push(
        NftController.checkAndUpdateAllNftsOwnershipStatus(networkClientId),
      );
    });

    await Promise.allSettled(actions);
    setRefreshing(false);
    endTrace({ name: TraceName.DetectNfts });

    // Get updated state after refresh
    const newNfts = cloneDeep(
      NftController.state.allNfts[selectedAddress.toLowerCase()],
    );

    const eventParams = prepareNftDetectionEvents(
      previousNfts,
      newNfts,
      getNftDetectionAnalyticsParams,
    );
    eventParams.forEach((params) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.COLLECTIBLE_ADDED)
          .addProperties({
            chain_id: params.chain_id,
            source: params.source,
          })
          .build(),
      );
    });
  }, [
    selectedAddress,
    chainIdsToDetectNftsFor,
    allNetworkClientIds,
    getNftDetectionAnalyticsParams,
    trackEvent,
    createEventBuilder,
  ]);

  return {
    refreshing,
    onRefresh,
  };
};
