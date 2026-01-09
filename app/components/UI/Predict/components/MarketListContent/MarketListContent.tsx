import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useStyles } from '../../../../../component-library/hooks';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import styleSheet from './MarketListContent.styles';
import {
  PredictCategory,
  PredictMarket as PredictMarketType,
  Recurrence,
} from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarket from '../PredictMarket';
import PredictMarketSkeleton from '../PredictMarketSkeleton';
import PredictMarketSport from '../PredictMarketSport';
import { getPredictMarketListSelector } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { ScrollCoordinator } from '../../types/scrollCoordinator';
import PredictOffline from '../PredictOffline';
import { strings } from '../../../../../../locales/i18n';
import PredictionsDark from '../../../../../images/predictions-no-search-results-dark.svg';
import PredictionsLight from '../../../../../images/predictions-no-search-results-light.svg';
import { useAssetFromTheme } from '../../../../../util/theme';
interface MarketListContentProps {
  q?: string;
  category: PredictCategory;
  entryPoint?: PredictEntryPoint;
  scrollCoordinator?: ScrollCoordinator;
}

// create once at module scope to avoid remounting on each render
type PredictFlashListProps = FlashListProps<PredictMarketType>;
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<PredictFlashListProps>,
) as unknown as React.ComponentType<PredictFlashListProps>;

const MarketListContent: React.FC<MarketListContentProps> = ({
  category,
  q,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  scrollCoordinator,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const ThemedPredictions = useAssetFromTheme(
    PredictionsLight,
    PredictionsDark,
  );
  const tw = useTailwind();
  const {
    marketData,
    isFetching,
    isFetchingMore,
    error,
    hasMore,
    refetch,
    fetchMore,
  } = usePredictMarketData({ category, q, pageSize: 20 });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrollHandler = scrollCoordinator?.getScrollHandler(category);

  const renderItem = useCallback(
    (info: { item: PredictMarketType; index: number }) => (
      <PredictMarket
        market={info.item}
        entryPoint={entryPoint}
        testID={getPredictMarketListSelector.marketCardByCategory(
          category,
          info.index + 1,
        )}
      />
    ),
    [category, entryPoint],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      fetchMore();
    }
  }, [hasMore, isFetchingMore, fetchMore]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) return null;

    return (
      <Box twClassName="py-2">
        <PredictMarketSkeleton testID="skeleton-footer-1" />
        <PredictMarketSkeleton testID="skeleton-footer-2" />
      </Box>
    );
  }, [isFetchingMore]);

  const renderPinnedItem = useCallback(() => {
    if (category !== 'trending') return null;

    return (
      <Box twClassName="my-2">
        <PredictMarketSport
          market={{
            id: '1',
            providerId: 'polymarket',
            slug: 'super-bowl-lx-2026',
            title: 'Super Bowl LX (2026)',
            description: 'Super Bowl LX matchup between SEA and DEN',
            image: '',
            status: 'open',
            recurrence: Recurrence.NONE,
            category: 'sports',
            tags: ['NFL', 'Super Bowl'],
            outcomes: [],
            liquidity: 0,
            volume: 0,
          }}
          entryPoint={entryPoint}
        />
      </Box>
    );
  }, [category, entryPoint]);

  if (isFetching) {
    return (
      <Box style={styles.loadingContainer} twClassName="py-2 px-4">
        <PredictMarketSkeleton testID="skeleton-loading-1" />
        <PredictMarketSkeleton testID="skeleton-loading-2" />
        <PredictMarketSkeleton testID="skeleton-loading-3" />
        <PredictMarketSkeleton testID="skeleton-loading-4" />
      </Box>
    );
  }

  if (error) {
    return <PredictOffline onRetry={handleRefresh} />;
  }

  if (q && q.length > 0 && marketData.length === 0) {
    return (
      <Box
        testID={getPredictMarketListSelector.emptyState()}
        style={styles.emptySearchContainer}
      >
        <ThemedPredictions
          testID="icon"
          width={100}
          height={100}
          style={tw.style('mb-4')}
        />
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('predict.search_no_markets_found', { q })}
        </Text>
      </Box>
    );
  }

  if (!marketData || marketData.length === 0) {
    return (
      <Box
        testID={getPredictMarketListSelector.emptyState()}
        style={styles.emptyContainer}
      >
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('predict.search_empty_state', { category })}
        </Text>
      </Box>
    );
  }

  if (scrollCoordinator && scrollHandler) {
    return (
      <AnimatedFlashList
        data={marketData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderPinnedItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.7}
        ListFooterComponent={renderFooter}
        onScroll={scrollHandler as never}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={tw.style('pt-2 pb-4 px-4')}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        getItemType={() => 'market'}
      />
    );
  }

  return (
    <FlashList
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={renderPinnedItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={tw.style('pt-4 pb-5 px-4')}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      getItemType={() => 'market'}
    />
  );
};

export default MarketListContent;
