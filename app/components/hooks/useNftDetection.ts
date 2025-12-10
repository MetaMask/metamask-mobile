import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { cloneDeep } from 'lodash';
import Engine from '../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../selectors/accountsController';
import { endTrace, trace, TraceName } from '../../util/trace';
import { MetaMetricsEvents, useMetrics } from './useMetrics';
import { useNftDetectionChainIds } from './useNftDetectionChainIds';
import { prepareNftDetectionEvents } from '../../util/assets';
import { getDecimalChainId } from '../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import Logger from '../../util/Logger';
import {
  hideNftFetchingLoadingIndicator,
  showNftFetchingLoadingIndicator,
} from '../../reducers/collectibles';

/**
 * Hook that provides NFT detection functionality
 * Encapsulates the common logic used across the app for detecting NFTs
 */
export const useNftDetection = () => {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const chainIdsToDetectNftsFor = useNftDetectionChainIds();

  const getNftDetectionAnalyticsParams = useCallback((nft: Nft) => {
    try {
      return {
        chain_id: getDecimalChainId(nft.chainId),
        source: 'detected' as const,
      };
    } catch (error) {
      Logger.error(
        error as Error,
        'useNftDetection.getNftDetectionAnalyticsParams',
      );
      return undefined;
    }
  }, []);

  const detectNfts = useCallback(async () => {
    if (!selectedAddress) return;

    const { NftDetectionController, NftController } = Engine.context;
    const formattedSelectedAddress = selectedAddress.toLowerCase();

    const previousNfts = cloneDeep(
      NftController.state.allNfts[formattedSelectedAddress],
    );

    try {
      trace({ name: TraceName.DetectNfts });
      dispatch(showNftFetchingLoadingIndicator());

      await NftDetectionController.detectNfts(chainIdsToDetectNftsFor);

      endTrace({ name: TraceName.DetectNfts });
    } finally {
      dispatch(hideNftFetchingLoadingIndicator());
    }

    const newNfts = cloneDeep(
      NftController.state.allNfts[formattedSelectedAddress],
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
    dispatch,
    trackEvent,
    createEventBuilder,
    getNftDetectionAnalyticsParams,
  ]);

  return { detectNfts, chainIdsToDetectNftsFor };
};
