import { RefreshControl } from 'react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import { cloneDeep } from 'lodash';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { useNftDetectionChainIds } from '../../hooks/useNftDetectionChainIds';
import { prepareNftDetectionEvents } from '../../../util/assets';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import Logger from '../../../util/Logger';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';
import { selectNetworkConfigurations } from '../../../selectors/networkController';

const NftGridListRefreshControl = () => {
  const { colors } = useTheme();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const allNetworks = useSelector(selectNetworkConfigurations);
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
      Logger.error(error as Error, 'Wallet.getNftDetectionAnalyticsParams');
      return undefined;
    }
  }, []);

  const allNetworkClientIds = useMemo(
    () =>
      Object.keys(tokenNetworkFilter).flatMap((chainId) => {
        if (isNonEvmChainId(chainId)) return [];
        const entry = allNetworks[chainId];
        if (!entry) {
          return [];
        }
        const index = entry.defaultRpcEndpointIndex;
        const endpoint = entry.rpcEndpoints[index];
        return endpoint?.networkClientId ? [endpoint.networkClientId] : [];
      }),
    [tokenNetworkFilter, allNetworks],
  );

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(async () => {
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
    });
  }, [
    chainIdsToDetectNftsFor,
    allNetworkClientIds,
    createEventBuilder,
    getNftDetectionAnalyticsParams,
    selectedAddress,
    trackEvent,
  ]);

  return (
    <RefreshControl
      colors={[colors.primary.default]}
      tintColor={colors.icon.default}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

export default NftGridListRefreshControl;
