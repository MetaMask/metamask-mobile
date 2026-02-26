import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Modal } from 'react-native';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import BridgeTrendingTokensSection from '../BridgeTrendingTokensSection/BridgeTrendingTokensSection';
import {
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
  TrendingTokenTimeBottomSheet,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import { useBridgeTrendingTokens } from '../../hooks/useBridgeTrendingTokens/useBridgeTrendingTokens';

const TOKEN_CHUNK_SIZE = 12;

type ActiveBottomSheet = 'none' | 'time' | 'network' | 'price_change';

export interface BridgeTrendingZeroStateRef {
  loadNextChunkIfAvailable: () => void;
}

const BridgeTrendingZeroState = forwardRef<BridgeTrendingZeroStateRef>(
  (_props, ref) => {
    const [activeBottomSheet, setActiveBottomSheet] =
      useState<ActiveBottomSheet>('none');
    const [visibleTokenCount, setVisibleTokenCount] =
      useState(TOKEN_CHUNK_SIZE);
    const networkConfigurations = useSelector(
      selectNetworkConfigurationsByCaipChainId,
    );
    const {
      selectedTimeOption,
      selectedNetwork,
      selectedPriceChangeOption,
      priceChangeSortDirection,
      selectedNetworkName,
      priceChangeButtonText,
      filterContext,
      trendingTokens,
      isLoading,
      handlePriceChangeSelect,
      handleNetworkSelect,
      handleTimeSelect,
    } = useBridgeTrendingTokens({
      networkConfigurations,
    });

    useEffect(() => {
      if (isLoading) {
        setVisibleTokenCount(TOKEN_CHUNK_SIZE);
        return;
      }

      setVisibleTokenCount(Math.min(TOKEN_CHUNK_SIZE, trendingTokens.length));
    }, [isLoading, trendingTokens]);

    const hasMore = visibleTokenCount < trendingTokens.length;

    const loadNextChunk = useCallback(() => {
      setVisibleTokenCount((currentCount) =>
        Math.min(currentCount + TOKEN_CHUNK_SIZE, trendingTokens.length),
      );
    }, [trendingTokens.length]);

    const loadNextChunkIfAvailable = useCallback(() => {
      if (activeBottomSheet !== 'none' || isLoading || !hasMore) {
        return;
      }

      loadNextChunk();
    }, [activeBottomSheet, hasMore, isLoading, loadNextChunk]);

    useImperativeHandle(
      ref,
      () => ({
        loadNextChunkIfAvailable,
      }),
      [loadNextChunkIfAvailable],
    );

    const closeBottomSheet = useCallback(() => {
      setActiveBottomSheet('none');
    }, []);

    const openBottomSheet = useCallback((type: ActiveBottomSheet) => {
      setActiveBottomSheet(type);
    }, []);

    const visibleTrendingTokens = useMemo(
      () => trendingTokens.slice(0, visibleTokenCount),
      [trendingTokens, visibleTokenCount],
    );

    return (
      <>
        <BridgeTrendingTokensSection
          selectedTimeOption={selectedTimeOption}
          selectedNetworkName={selectedNetworkName}
          priceChangeButtonText={priceChangeButtonText}
          filterContext={filterContext}
          trendingTokens={visibleTrendingTokens}
          isLoading={isLoading}
          hasMore={hasMore}
          onPriceChangePress={() => openBottomSheet('price_change')}
          onNetworkPress={() => openBottomSheet('network')}
          onTimePress={() => openBottomSheet('time')}
          onShowMore={loadNextChunkIfAvailable}
        />

        <Modal
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          hardwareAccelerated
          statusBarTranslucent
          visible={activeBottomSheet !== 'none'}
          onRequestClose={closeBottomSheet}
        >
          {activeBottomSheet === 'time' && (
            <TrendingTokenTimeBottomSheet
              isVisible
              onClose={closeBottomSheet}
              onTimeSelect={handleTimeSelect}
              selectedTime={selectedTimeOption}
            />
          )}
          {activeBottomSheet === 'network' && (
            <TrendingTokenNetworkBottomSheet
              isVisible
              onClose={closeBottomSheet}
              onNetworkSelect={handleNetworkSelect}
              selectedNetwork={selectedNetwork}
            />
          )}
          {activeBottomSheet === 'price_change' && (
            <TrendingTokenPriceChangeBottomSheet
              isVisible
              onClose={closeBottomSheet}
              onPriceChangeSelect={handlePriceChangeSelect}
              selectedOption={selectedPriceChangeOption}
              sortDirection={priceChangeSortDirection}
            />
          )}
        </Modal>
      </>
    );
  },
);

BridgeTrendingZeroState.displayName = 'BridgeTrendingZeroState';

export default BridgeTrendingZeroState;
