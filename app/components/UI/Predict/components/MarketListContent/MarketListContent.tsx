import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import styleSheet from './MarketListContent.styles';
import {
  PredictCategory,
  PredictMarket as PredictMarketType,
} from '../../types';
import PredictMarket from '../PredictMarket';
import PredictMarketMultiple from '../PredictMarketMultiple';

interface MarketListContentProps {
  q?: string;
  category: PredictCategory;
}

const MarketListContent: React.FC<MarketListContentProps> = ({
  category,
  q,
}) => {
  const { styles } = useStyles(styleSheet, {});
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

  const listRef = useRef<FlashListRef<PredictMarketType>>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const renderItem = useCallback(({ item }: { item: PredictMarketType }) => {
    if (item.outcomes.length === 1) {
      return (
        <PredictMarket
          key={item.outcomes[0].id}
          outcome={item.outcomes[0]}
          providerId={item.providerId}
        />
      );
    }
    return <PredictMarketMultiple key={item.id} market={item} />;
  }, []);

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
      <Box twClassName="py-4">
        <Skeleton
          testID="skeleton-footer-1"
          height={40}
          width={'80%'}
          style={styles.skeleton}
        />
        <Skeleton
          testID="skeleton-footer-2"
          height={40}
          width={'60%'}
          style={styles.skeleton}
        />
        <Skeleton
          testID="skeleton-footer-3"
          height={40}
          width={'40%'}
          style={styles.skeleton}
        />
        <Skeleton
          testID="skeleton-footer-4"
          height={40}
          width={'20%'}
          style={styles.skeleton}
        />
      </Box>
    );
  }, [isFetchingMore, styles.skeleton]);

  if (isFetching) {
    return (
      <Box style={styles.loadingContainer}>
        <Skeleton
          testID="skeleton-loading-1"
          height={60}
          width={'100%'}
          style={styles.skeleton}
        />
        <Skeleton
          testID="skeleton-loading-2"
          height={60}
          width={'60%'}
          style={styles.skeleton}
        />
        <Skeleton
          testID="skeleton-loading-3"
          height={60}
          width={'40%'}
          style={styles.skeleton}
        />
        <Skeleton
          testID="skeleton-loading-4"
          height={60}
          width={'20%'}
          style={styles.skeleton}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={styles.errorContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
          Error: {error}
        </Text>
      </Box>
    );
  }

  if (!marketData || marketData.length === 0) {
    return (
      <Box style={styles.emptyContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          No {category} markets available
        </Text>
      </Box>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={tw.style('pb-5')}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      getItemType={(item) =>
        item.outcomes.length === 1 ? 'single' : 'multiple'
      }
    />
  );
};

export default MarketListContent;
