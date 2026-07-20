import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  FlashList,
  type FlashListRef,
  type ListRenderItem,
} from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../../../../component-library/hooks';
import ExploreSearchBar from '../../../../../Views/TrendingView/components/ExploreSearchBar/ExploreSearchBar';
import CryptoMoversPillItem from '../../../../../Views/TrendingView/feeds/tokens/CryptoMoversPillItem';
import { POPULAR_SEARCH_ASSETS } from '../../../../../Views/TrendingView/search/popularSearchAssets';
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
  const flashListRef = useRef<FlashListRef<TrendingAsset>>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isDebouncing = searchQuery !== debouncedQuery;

  const { data, isLoading, loadMore, isLoadingMore, hasMore } = useTokensFeed({
    query: debouncedQuery,
  });

  const isFeedLoading = isDebouncing || isLoading;
  const hasActiveQuery = debouncedQuery.trim().length > 0;
  const listData = isFeedLoading ? [] : data;
  const showEmptyResults =
    hasActiveQuery && !isFeedLoading && listData.length === 0;

  useEffect(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery, debouncedQuery, showEmptyResults]);

  // Reset only when the query changes — not when loading finishes. FlashList
  // does not re-fire onLoad on data updates, so resetting on isFeedLoading
  // would leave the skeleton overlay stuck after the fetch completes.
  useEffect(() => {
    setIsListReady(false);
  }, [debouncedQuery]);

  useEffect(() => {
    if (isFeedLoading || listData.length === 0 || isListReady) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsListReady(true);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isFeedLoading, isListReady, listData.length]);

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
      isLoadingMore && listData.length > 0 ? (
        <ActivityIndicator
          style={styles.loadingFooter}
          accessibilityLabel="Loading more results"
        />
      ) : null,
    [isLoadingMore, listData.length, styles.loadingFooter],
  );

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
    if (isFeedLoading || listData.length === 0 || !hasMore || !loadMore) {
      return;
    }
    loadMore();
  }, [hasMore, isFeedLoading, listData.length, loadMore]);

  const handleListLoad = useCallback(() => {
    if (listData.length > 0) {
      setIsListReady(true);
    }
  }, [listData.length]);

  const listHeaderComponent = useMemo(() => {
    if (!showEmptyResults) {
      return null;
    }

    return (
      <View testID={WatchlistSearchContentTestIds.EMPTY_STATE}>
        <Box twClassName="rounded-xl bg-secondary py-6 px-4 items-center">
          <TabEmptyState
            description={strings('trending.no_results_for_query', {
              query: debouncedQuery.trim(),
            })}
            descriptionProps={{
              variant: TextVariant.HeadingSm,
              fontWeight: FontWeight.Bold,
              color: TextColor.TextDefault,
            }}
          />
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('trending.no_results_check_popular')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2 mt-2"
          >
            {POPULAR_SEARCH_ASSETS.map((token, index) => (
              <CryptoMoversPillItem
                key={token.assetId}
                token={token}
                index={index}
              />
            ))}
          </Box>
        </Box>
      </View>
    );
  }, [debouncedQuery, showEmptyResults]);

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
          ref={flashListRef}
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
          ListHeaderComponent={listHeaderComponent}
          ListFooterComponent={footer}
          testID={WatchlistSearchContentTestIds.LIST}
        />
        {skeletonOverlay}
      </View>
    </View>
  );
};

export default WatchlistSearchContent;
