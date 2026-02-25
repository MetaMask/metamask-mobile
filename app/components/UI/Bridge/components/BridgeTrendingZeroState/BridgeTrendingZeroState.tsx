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
import SwapTrendingTokensSection from '../SwapTrendingTokensSection/SwapTrendingTokensSection';
import {
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
  TrendingTokenTimeBottomSheet,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import { useBridgeTrendingTokens } from '../../hooks/useBridgeTrendingTokens/useBridgeTrendingTokens';

const INITIAL_VISIBLE_TOKENS = 12;
const TOKEN_RENDER_CHUNK_SIZE = 12;

type ActiveBottomSheet = 'none' | 'time' | 'network' | 'price_change';

export interface BridgeTrendingZeroStateRef {
  loadNextChunkIfAvailable: () => void;
}

const BridgeTrendingZeroState = forwardRef<BridgeTrendingZeroStateRef>(
  (_props, ref) => {
    const [activeBottomSheet, setActiveBottomSheet] =
      useState<ActiveBottomSheet>('none');
    const [visibleTokenCount, setVisibleTokenCount] = useState(
      INITIAL_VISIBLE_TOKENS,
    );
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
        setVisibleTokenCount(INITIAL_VISIBLE_TOKENS);
        return;
      }

      setVisibleTokenCount(
        Math.min(INITIAL_VISIBLE_TOKENS, trendingTokens.length),
      );
    }, [isLoading, trendingTokens]);

    const hasMore = visibleTokenCount < trendingTokens.length;

    const loadNextChunk = useCallback(() => {
      setVisibleTokenCount((currentCount) =>
        Math.min(currentCount + TOKEN_RENDER_CHUNK_SIZE, trendingTokens.length),
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

    const handlePriceChangePress = useCallback(() => {
      setActiveBottomSheet('price_change');
    }, []);

    const handleNetworkPress = useCallback(() => {
      setActiveBottomSheet('network');
    }, []);

    const handleTimePress = useCallback(() => {
      setActiveBottomSheet('time');
    }, []);

    const visibleTrendingTokens = useMemo(
      () => trendingTokens.slice(0, visibleTokenCount),
      [trendingTokens, visibleTokenCount],
    );

    const isBottomSheetVisible = activeBottomSheet !== 'none';

    const bottomSheetContent = useMemo(() => {
      if (activeBottomSheet === 'time') {
        return (
          <TrendingTokenTimeBottomSheet
            isVisible
            onClose={closeBottomSheet}
            onTimeSelect={handleTimeSelect}
            selectedTime={selectedTimeOption}
            isFullscreen={false}
          />
        );
      }

      if (activeBottomSheet === 'network') {
        return (
          <TrendingTokenNetworkBottomSheet
            isVisible
            onClose={closeBottomSheet}
            onNetworkSelect={handleNetworkSelect}
            selectedNetwork={selectedNetwork}
            isFullscreen
          />
        );
      }

      if (activeBottomSheet === 'price_change') {
        return (
          <TrendingTokenPriceChangeBottomSheet
            isVisible
            onClose={closeBottomSheet}
            onPriceChangeSelect={handlePriceChangeSelect}
            selectedOption={selectedPriceChangeOption}
            sortDirection={priceChangeSortDirection}
            isFullscreen={false}
          />
        );
      }

      return null;
    }, [
      activeBottomSheet,
      closeBottomSheet,
      handleTimeSelect,
      selectedTimeOption,
      handleNetworkSelect,
      selectedNetwork,
      handlePriceChangeSelect,
      selectedPriceChangeOption,
      priceChangeSortDirection,
    ]);

    return (
      <>
        <SwapTrendingTokensSection
          selectedTimeOption={selectedTimeOption}
          selectedNetworkName={selectedNetworkName}
          priceChangeButtonText={priceChangeButtonText}
          filterContext={filterContext}
          trendingTokens={visibleTrendingTokens}
          isLoading={isLoading}
          hasMore={hasMore}
          onPriceChangePress={handlePriceChangePress}
          onNetworkPress={handleNetworkPress}
          onTimePress={handleTimePress}
          onShowMore={loadNextChunkIfAvailable}
        />

        <Modal
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          hardwareAccelerated
          statusBarTranslucent
          visible={isBottomSheetVisible}
          onRequestClose={closeBottomSheet}
        >
          {bottomSheetContent}
        </Modal>
      </>
    );
  },
);

BridgeTrendingZeroState.displayName = 'BridgeTrendingZeroState';

export default BridgeTrendingZeroState;
