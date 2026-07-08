import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Keyboard, Platform } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingQuickBuy from '../../../../UI/Trending/components/TrendingQuickBuy/TrendingQuickBuy';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../../search/abTestConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import ExploreSearchBar from '../../components/ExploreSearchBar/ExploreSearchBar';
import PillRow, { type PillOption } from '../../components/PillRow';
import ExploreSearchResults from '../../search/ExploreSearchResults';
import SearchFeedRow, {
  SearchFeedSkeleton,
  getItemId,
} from '../../search/SearchFeedRow';
import {
  getExploreSearchResultCount,
  trackExploreSearchEvent,
  useInstrumentedSearchEffect,
  useScrollTracking,
  type SearchFeedPill,
} from '../../search/analytics';
import {
  type SearchFeedId,
  useExploreSearch,
} from '../../search/useExploreSearch';
import PerpsSectionProvider from '../../feeds/perps/PerpsSectionProvider';
import SitesSearchFooter from '../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { strings } from '../../../../../../locales/i18n';
import { MAX_ITEMS_PER_SECTION } from '../../search/viewMoreLabel';

const ALL_PILL_KEY = 'all' as const;
type ActivePill = typeof ALL_PILL_KEY | SearchFeedId;

interface FullFeedListProps {
  feedId: SearchFeedId;
  searchQuery: string;
  data: unknown[];
  isLoading?: boolean;
  title: string;
  tabName: SearchFeedPill;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  resultCount?: number;
}

const FullFeedList: React.FC<FullFeedListProps> = ({
  feedId,
  searchQuery,
  data,
  isLoading,
  title,
  tabName,
  fetchMore,
  isFetchingMore,
  hasMore,
  resultCount,
}) => {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<unknown>>(null);
  const [quickTradeToken, setQuickTradeToken] = useState<TrendingAsset | null>(
    null,
  );

  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );

  useEffect(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  const { onScrollBeginDrag, resetScrollTracking } = useScrollTracking(
    'scrolled',
    searchQuery,
    {
      tab_name: tabName,
      result_count: resultCount,
    },
  );

  useEffect(() => {
    resetScrollTracking();
  }, [searchQuery, resetScrollTracking]);

  const handleQuickTrade =
    (feedId === 'tokens' || feedId === 'stocks') &&
    quickBuyVariant.showQuickTradeButton
      ? setQuickTradeToken
      : undefined;

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => (
      <SearchFeedRow
        feedId={feedId}
        item={item}
        index={index}
        searchQuery={searchQuery}
        tabName={tabName}
        resultCount={resultCount}
        onQuickTrade={handleQuickTrade}
      />
    ),
    [feedId, searchQuery, tabName, resultCount, handleQuickTrade],
  );

  const keyExtractor = useCallback(
    (item: unknown, index: number) =>
      `${feedId}-${getItemId(feedId, item) || index}`,
    [feedId],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && fetchMore) {
      fetchMore();
    }
  }, [hasMore, fetchMore]);

  const footer = useMemo(
    () => (
      <>
        {isFetchingMore && (
          <ActivityIndicator
            style={tw.style('py-4')}
            accessibilityLabel="Loading more results"
          />
        )}
        {feedId === 'sites' && <SitesSearchFooter searchQuery={searchQuery} />}
      </>
    ),
    [isFetchingMore, feedId, searchQuery, tw],
  );

  if (isLoading) {
    return (
      <Box twClassName="flex-1 px-4">
        {Array.from({ length: MAX_ITEMS_PER_SECTION }, (_, i) => (
          <SearchFeedSkeleton key={i} feedId={feedId} />
        ))}
      </Box>
    );
  }

  return (
    <>
      <FlashList
        ref={flashListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={tw.style('px-4')}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={onScrollBeginDrag}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={footer}
      />
      <TrendingQuickBuy
        token={quickTradeToken}
        onClose={() => setQuickTradeToken(null)}
      />
    </>
  );
};

interface ExploreSearchContentProps {
  searchQuery: string;
}

/**
 * Renders the pill filter row and content pane for the search experience.
 * Must be a child of PerpsSectionProvider because useExploreSearch
 * internally calls usePerpsFeed, which requires PerpsStreamProvider.
 *
 * A single useExploreSearch instance is shared across the pill row and the
 * active content pane, so switching pills never triggers new API calls.
 */
const ExploreSearchContent: React.FC<ExploreSearchContentProps> = ({
  searchQuery,
}) => {
  const [activePill, setActivePill] = useState<ActivePill>(ALL_PILL_KEY);
  const activePillRef = useRef(activePill);
  activePillRef.current = activePill;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const { sections } = useExploreSearch(searchQuery, {
    exposePagination: true,
  });
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const isLoading = sections.some((s) => s.isLoading);

  const pills = useMemo<PillOption[]>(
    () => [
      { key: ALL_PILL_KEY, name: strings('trending.search_tabs.all') },
      ...sections.map((section) => ({
        key: section.feedId,
        name: section.title,
      })),
    ],
    [sections],
  );

  const activeSection = useMemo(
    () => sections.find((s) => s.feedId === activePill),
    [sections, activePill],
  );

  const getActivePill = useCallback(() => activePillRef.current, []);
  const getSections = useCallback(() => sectionsRef.current, []);

  useInstrumentedSearchEffect({
    searchQuery,
    isLoading,
    getPill: getActivePill,
    getSections,
  });

  const handlePillSelect = useCallback((key: string) => {
    const targetSections = sectionsRef.current;
    const resultCount = getExploreSearchResultCount(
      key as SearchFeedPill,
      targetSections,
    );
    trackExploreSearchEvent({
      interaction_type: 'tab_switched',
      search_query: searchQueryRef.current,
      tab_name: key as SearchFeedPill,
      previous_tab: activePillRef.current,
      result_count: resultCount,
    });
    setActivePill(key as ActivePill);
  }, []);

  // Used by ExploreSearchResults' "View all" button — the analytics event is
  // already fired inside handleViewMore there, so we only update state here.
  const handleViewMoreSelect = useCallback((key: string) => {
    setActivePill(key as ActivePill);
  }, []);

  const showFeedList =
    activePill !== ALL_PILL_KEY &&
    (activeSection?.isLoading || (activeSection?.items.length ?? 0) > 0);

  const emptyFeedTitle =
    !showFeedList && activePill !== ALL_PILL_KEY
      ? activeSection?.title
      : undefined;

  return (
    <Box twClassName="flex-1">
      <Box twClassName="px-4">
        <PillRow
          pills={pills}
          activeKey={activePill}
          onSelect={handlePillSelect}
          testIdPrefix="explore-search"
        />
      </Box>
      {showFeedList ? (
        <FullFeedList
          key={activePill}
          feedId={activePill}
          searchQuery={searchQuery}
          data={activeSection?.items ?? []}
          isLoading={activeSection?.isLoading}
          title={activeSection?.title ?? activePill}
          tabName={activePill}
          fetchMore={activeSection?.fetchMore}
          isFetchingMore={activeSection?.isFetchingMore}
          hasMore={activeSection?.hasMore}
          resultCount={activeSection?.total ?? activeSection?.items.length}
        />
      ) : (
        <ExploreSearchResults
          searchQuery={searchQuery}
          sections={sections}
          onViewMore={handleViewMoreSelect}
          emptyFeedTitle={emptyFeedTitle}
          activeTab={activePill}
        />
      )}
    </Box>
  );
};

const ExploreSearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  return (
    <Box
      style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0) }}
      twClassName="flex-1 bg-default"
    >
      <Box twClassName="px-4 pb-3">
        <ExploreSearchBar
          type="interactive"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCancel={handleSearchCancel}
        />
      </Box>

      <PerpsSectionProvider>
        <ExploreSearchContent searchQuery={searchQuery} />
      </PerpsSectionProvider>
    </Box>
  );
};

export default ExploreSearchScreen;
