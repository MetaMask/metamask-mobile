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
import {
  usePerpsFeed,
  type UsePerpsFeedResult,
} from '../../../../../Views/TrendingView/feeds/perps/usePerpsFeed';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import WatchlistSearchRowItem from '../../components/WatchlistSearchRowItem/WatchlistSearchRowItem';
import { WatchlistSearchContentTestIds } from './WatchlistSearchContent.testIds';
import styleSheet from './WatchlistSearchContent.styles';
import type { WatchlistFilter } from '../../../../Watchlist/types';
import {
  getPerpsWatchlistKey,
  getTokenWatchlistKey,
} from '../../../../Watchlist/utils';
import { usePerpsWatchlistActions } from '../../../../Perps/hooks/usePerpsWatchlistActions';
import { usePerpsNavigation } from '../../../../Perps/hooks/usePerpsNavigation';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import WatchlistErrorRow from '../../../../Watchlist/WatchlistErrorRow';

const DEBOUNCE_MS = 200;
const SKELETON_COUNT = 5;

interface WatchlistSearchContentProps {
  onDismiss: () => void;
  activeFilter?: WatchlistFilter;
  canUseLivePerpsPrices?: boolean;
}

type WatchlistSearchItem =
  | { kind: 'header'; key: string; domain: 'tokens' | 'perps' }
  | { kind: 'token'; key: string; token: TrendingAsset; index: number }
  | {
      kind: 'perp';
      key: string;
      market: PerpsMarketData;
      index: number;
      isWatchlisted: boolean;
    };

const EMPTY_PERPS_FEED: Pick<
  UsePerpsFeedResult,
  'data' | 'isLoading' | 'error' | 'refetch'
> = {
  data: [],
  isLoading: false,
  error: null,
  refetch: async () => undefined,
};

interface WatchlistSearchContentBodyProps extends WatchlistSearchContentProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  debouncedQuery: string;
  canFetchRemoteSearch: boolean;
  perps: Pick<UsePerpsFeedResult, 'data' | 'isLoading' | 'error' | 'refetch'>;
}

const WatchlistSearchContentBody: React.FC<WatchlistSearchContentBodyProps> = ({
  onDismiss,
  activeFilter = 'tokens',
  canUseLivePerpsPrices = false,
  searchQuery,
  setSearchQuery,
  debouncedQuery,
  canFetchRemoteSearch,
  perps,
}) => {
  const insets = useSafeAreaInsets();
  const topInsetPadding = insets.top + (Platform.OS === 'android' ? 16 : 0);
  const { styles } = useStyles(styleSheet, { topInsetPadding });
  const [isListReady, setIsListReady] = useState(false);
  const flashListRef = useRef<FlashListRef<WatchlistSearchItem>>(null);

  const isDebouncing = searchQuery !== debouncedQuery;

  const { data, isLoading, loadMore, isLoadingMore, hasMore } = useTokensFeed({
    query: debouncedQuery,
    enabled: canFetchRemoteSearch && activeFilter !== 'perps',
  });
  const { addToWatchlist, removeFromWatchlist } = usePerpsWatchlistActions(
    PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
    { showToasts: false },
  );
  const { navigateToMarketDetails } = usePerpsNavigation();

  const isFeedLoading =
    isDebouncing ||
    (activeFilter !== 'perps' && isLoading) ||
    (activeFilter !== 'tokens' && perps.isLoading);
  const hasActiveQuery = debouncedQuery.trim().length > 0;
  const listData = useMemo<WatchlistSearchItem[]>(() => {
    const items: WatchlistSearchItem[] = [];

    if (activeFilter !== 'perps' && data.length > 0) {
      items.push({ kind: 'header', key: 'header:tokens', domain: 'tokens' });
      items.push(
        ...data.map((token, index) => ({
          kind: 'token' as const,
          key: getTokenWatchlistKey(String(token.assetId)),
          token,
          index,
        })),
      );
    }

    if (
      activeFilter !== 'tokens' &&
      (activeFilter === 'perps' || hasActiveQuery) &&
      perps.data.length > 0
    ) {
      items.push({ kind: 'header', key: 'header:perps', domain: 'perps' });
      items.push(
        ...perps.data.map(({ market, isWatchlisted }, index) => ({
          kind: 'perp' as const,
          key: getPerpsWatchlistKey(market.symbol),
          market,
          index,
          isWatchlisted,
        })),
      );
    }

    return items;
  }, [activeFilter, data, hasActiveQuery, perps.data]);
  const resultCount = listData.filter((item) => item.kind !== 'header').length;
  const hasActivePerpsError =
    activeFilter !== 'tokens' &&
    (activeFilter === 'perps' || hasActiveQuery) &&
    !perps.isLoading &&
    Boolean(perps.error);
  const hasOfflineSearch = hasActiveQuery && !canFetchRemoteSearch;
  const showEmptyResults =
    hasActiveQuery &&
    !isFeedLoading &&
    !hasOfflineSearch &&
    !hasActivePerpsError &&
    resultCount === 0;

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
    if (isFeedLoading || resultCount === 0 || isListReady) {
      return;
    }

    let cancelled = false;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      innerFrame = requestAnimationFrame(() => {
        if (!cancelled) {
          setIsListReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [debouncedQuery, isFeedLoading, isListReady, resultCount]);

  const handleCancel = useCallback(() => {
    setSearchQuery('');
    onDismiss();
  }, [onDismiss, setSearchQuery]);

  const renderItem: ListRenderItem<WatchlistSearchItem> = useCallback(
    ({ item }) => {
      if (item.kind === 'header') {
        return (
          <Box twClassName="py-3">
            <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
              {item.domain === 'tokens'
                ? strings('token_watchlist.tokens_tab')
                : strings('perps.title')}
            </Text>
          </Box>
        );
      }

      if (item.kind === 'token') {
        return <WatchlistSearchRowItem token={item.token} index={item.index} />;
      }

      return (
        <PerpsMarketRowItem
          market={item.market}
          onPress={(market) =>
            navigateToMarketDetails(
              market,
              PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
            )
          }
          compact
          enableLivePrices={canUseLivePerpsPrices}
          isWatchlisted={item.isWatchlisted}
          onAddPress={
            item.isWatchlisted
              ? undefined
              : (market) => {
                  addToWatchlist(market.symbol).catch(() => undefined);
                }
          }
          onWatchlistPress={
            item.isWatchlisted
              ? (market) => {
                  removeFromWatchlist(market.symbol).catch(() => undefined);
                }
              : undefined
          }
        />
      );
    },
    [
      addToWatchlist,
      canUseLivePerpsPrices,
      navigateToMarketDetails,
      removeFromWatchlist,
    ],
  );

  const keyExtractor = useCallback((item: WatchlistSearchItem) => item.key, []);

  const footer = useMemo(
    () =>
      isLoadingMore && listData.length > 0 ? (
        <ActivityIndicator
          style={styles.loadingFooter}
          accessibilityLabel={strings('token_watchlist.loading_more_results')}
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
    if (
      isFeedLoading ||
      activeFilter === 'perps' ||
      resultCount === 0 ||
      !hasMore ||
      !loadMore
    ) {
      return;
    }
    loadMore();
  }, [activeFilter, hasMore, isFeedLoading, loadMore, resultCount]);

  const handleListLoad = useCallback(() => {
    if (resultCount > 0) {
      setIsListReady(true);
    }
  }, [resultCount]);

  const refetchPerps = perps.refetch;
  const listHeaderComponent = useMemo(() => {
    if (hasOfflineSearch) {
      return (
        <WatchlistErrorRow testID={WatchlistSearchContentTestIds.ERROR_STATE} />
      );
    }

    if (hasActivePerpsError) {
      return (
        <WatchlistErrorRow
          onRetry={() => {
            refetchPerps().catch(() => undefined);
          }}
          testID={WatchlistSearchContentTestIds.ERROR_STATE}
        />
      );
    }

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
  }, [
    debouncedQuery,
    hasActivePerpsError,
    hasOfflineSearch,
    refetchPerps,
    showEmptyResults,
  ]);

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

interface WatchlistSearchContentWithPerpsProps
  extends Omit<WatchlistSearchContentBodyProps, 'perps'> {
  activeFilter: WatchlistFilter;
}

const WatchlistSearchContentWithPerps: React.FC<
  WatchlistSearchContentWithPerpsProps
> = (props) => {
  const perps = usePerpsFeed({
    query: props.debouncedQuery,
    skipInitialFetch:
      (props.activeFilter !== 'perps' &&
        props.debouncedQuery.trim().length === 0) ||
      !props.canFetchRemoteSearch,
  });

  return <WatchlistSearchContentBody {...props} perps={perps} />;
};

const WatchlistSearchContent: React.FC<WatchlistSearchContentProps> = ({
  onDismiss,
  activeFilter = 'tokens',
  canUseLivePerpsPrices = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const networkTier = useNetworkTier();
  const canFetchRemoteSearch = networkTier !== 'NONE';

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sharedProps = {
    onDismiss,
    activeFilter,
    canUseLivePerpsPrices,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    canFetchRemoteSearch,
  };

  if (activeFilter === 'tokens') {
    return (
      <WatchlistSearchContentBody {...sharedProps} perps={EMPTY_PERPS_FEED} />
    );
  }

  return <WatchlistSearchContentWithPerps {...sharedProps} />;
};

export default WatchlistSearchContent;
