import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../../../../component-library/hooks';
import ExploreSearchBar from '../../../../../Views/TrendingView/components/ExploreSearchBar/ExploreSearchBar';
import { useTokensFeed } from '../../../../../Views/TrendingView/feeds/tokens/useTokensFeed';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import WatchlistSearchRowItem from '../../components/WatchlistSearchRowItem/WatchlistSearchRowItem';
import { WatchlistSearchContentTestIds } from './WatchlistSearchContent.testIds';
import styleSheet from './WatchlistSearchContent.styles';

const DEBOUNCE_MS = 200;
const SKELETON_COUNT = 5;

interface WatchlistSearchContentProps {
  onDismiss: () => void;
}

const WatchlistSearchContent: React.FC<WatchlistSearchContentProps> = ({
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const topInsetPadding = insets.top + (Platform.OS === 'android' ? 16 : 0);
  const { styles } = useStyles(styleSheet, { topInsetPadding });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isListReady, setIsListReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isDebouncing = searchQuery !== debouncedQuery;

  const { data, isLoading, loadMore, isLoadingMore, hasMore } = useTokensFeed({
    query: debouncedQuery,
  });

  const isFeedLoading = isDebouncing || isLoading;

  useEffect(() => {
    setIsListReady(false);
  }, [debouncedQuery, isFeedLoading]);

  const handleCancel = useCallback(() => {
    setSearchQuery('');
    onDismiss();
  }, [onDismiss]);

  const renderItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => <WatchlistSearchRowItem token={item} index={index} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: TrendingAsset, index: number) => item.assetId ?? String(index),
    [],
  );

  const footer = useMemo(
    () =>
      isLoadingMore ? (
        <ActivityIndicator
          style={styles.loadingFooter}
          accessibilityLabel="Loading more results"
        />
      ) : null,
    [isLoadingMore, styles.loadingFooter],
  );

  const listData = isFeedLoading ? [] : data;

  const showSkeletonOverlay =
    isFeedLoading || (listData.length > 0 && !isListReady);

  const skeletonOverlay = useMemo(
    () =>
      showSkeletonOverlay ? (
        <View
          style={styles.skeletonOverlay}
          testID={WatchlistSearchContentTestIds.SKELETON_OVERLAY}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <TrendingTokensSkeleton
              key={`watchlist-search-skeleton-${index}`}
            />
          ))}
        </View>
      ) : null,
    [showSkeletonOverlay, styles.skeletonOverlay],
  );

  const handleEndReached = useCallback(() => {
    if (isFeedLoading || !hasMore || !loadMore) {
      return;
    }
    loadMore();
  }, [hasMore, isFeedLoading, loadMore]);

  const handleListLoad = useCallback(() => {
    setIsListReady(true);
  }, []);

  return (
    <View
      style={styles.container}
      testID={WatchlistSearchContentTestIds.CONTAINER}
    >
      <View
        style={styles.searchBarContainer}
        testID={WatchlistSearchContentTestIds.SEARCH_BAR_CONTAINER}
      >
        <ExploreSearchBar
          type="interactive"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCancel={handleCancel}
          placeholder={strings('token_watchlist.search_placeholder')}
          rowTwClassName="gap-3"
        />
      </View>
      <View style={styles.listContainer}>
        <FlashList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          onLoad={handleListLoad}
          ListFooterComponent={footer}
          testID={WatchlistSearchContentTestIds.LIST}
        />
        {skeletonOverlay}
      </View>
    </View>
  );
};

export default WatchlistSearchContent;
