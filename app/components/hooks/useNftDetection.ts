import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../selectors/accountsController';
import { endTrace, trace, TraceName } from '../../util/trace';
import { MetaMetricsEvents } from '../../core/Analytics';
import { useAnalytics } from './useAnalytics/useAnalytics';
import { useNftDetectionChainIds } from './useNftDetectionChainIds';
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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const detectNfts = useCallback(
    async (firstPageOnly = true, showLoadingIndicator = true) => {
      if (!selectedAddress) return;

      const { NftDetectionController, NftController, PreferencesController } =
        Engine.context;

      // Read fresh state from the controller to avoid stale closure values
      const isNftDetectionCurrentlyEnabled =
        PreferencesController.state.useNftDetection;

      if (!isNftDetectionCurrentlyEnabled) return;

      // Abort any in-progress detection
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this detection
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const formattedSelectedAddress = selectedAddress.toLowerCase();

      // Capture a lightweight identity snapshot of existing NFTs before detection.
      // NftController uses immer, so allNfts[address] is a frozen immutable object —
      // no deep clone needed. We only need (chainId, address, tokenId) to detect new arrivals.
      const previousNftKeys = new Set(
        Object.entries(
          NftController.state.allNfts[formattedSelectedAddress] ?? {},
        ).flatMap(([chainId, nfts]) =>
          nfts.map((nft) => `${chainId}:${nft.address}:${nft.tokenId}`),
        ),
      );

      try {
        trace({ name: TraceName.DetectNfts });
        if (showLoadingIndicator) {
          dispatch(showNftFetchingLoadingIndicator());
        }

        await NftDetectionController.detectNfts(chainIdsToDetectNftsFor, {
          firstPageOnly,
          signal: abortController.signal,
        });
      } finally {
        endTrace({ name: TraceName.DetectNfts });
        if (showLoadingIndicator) {
          dispatch(hideNftFetchingLoadingIndicator());
        }
      }

      // Read live state directly — no clone needed, we only read from it.
      const newNfts = NftController.state.allNfts[formattedSelectedAddress];

      const newlyDetectedNfts = Object.entries(newNfts ?? {}).flatMap(
        ([chainId, nfts]) =>
          nfts.filter(
            (nft) =>
              !previousNftKeys.has(`${chainId}:${nft.address}:${nft.tokenId}`),
          ),
      );

      newlyDetectedNfts.forEach((nft) => {
        const params = getNftDetectionAnalyticsParams(nft);
        if (params) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.COLLECTIBLE_ADDED)
              .addProperties({
                chain_id: params.chain_id,
                source: params.source,
              })
              .build(),
          );
        }
      });
    },
    [
      selectedAddress,
      chainIdsToDetectNftsFor,
      dispatch,
      trackEvent,
      createEventBuilder,
      getNftDetectionAnalyticsParams,
    ],
  );

  const abortDetection = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { detectNfts, abortDetection, chainIdsToDetectNftsFor };
};
