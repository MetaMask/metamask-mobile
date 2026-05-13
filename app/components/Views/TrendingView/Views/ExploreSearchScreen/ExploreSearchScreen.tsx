import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import ExploreSearchBar from '../../components/ExploreSearchBar/ExploreSearchBar';
import PillRow, { type PillOption } from '../../components/PillRow';
import ExploreSearchResults from '../../search/ExploreSearchResults';
import ExploreSearchResultsV2 from '../../search/ExploreSearchResultsV2';
import SearchFeedRow from '../../search/SearchFeedRow';
import { useScrollTracking } from '../../search/analytics';
import {
  useExploreSearchV2,
  type SearchFeedId,
} from '../../search/useExploreSearchV2';
import PerpsSectionProvider from '../../feeds/perps/PerpsSectionProvider';
import SitesSearchFooter from '../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { strings } from '../../../../../../locales/i18n';
import { selectExploreSearchV2EnabledFlag } from '../../../../../selectors/featureFlagController/exploreSearchV2';

const ALL_PILL_KEY = 'all' as const;
type ActivePill = typeof ALL_PILL_KEY | SearchFeedId;

interface FullFeedListProps {
  feedId: SearchFeedId;
  searchQuery: string;
  data: unknown[];
  title: string;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
}

const FullFeedList: React.FC<FullFeedListProps> = ({
  feedId,
  searchQuery,
  data,
  title,
  fetchMore,
  isFetchingMore,
  hasMore,
}) => {
  const tw = useTailwind();
  const { onScrollBeginDrag } = useScrollTracking('tab_scrolled', searchQuery, {
    section_name: title,
  });

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => (
      <SearchFeedRow
        feedId={feedId}
        item={item}
        index={index}
        searchQuery={searchQuery}
        sectionTitle={title}
        interactionType="view_all_item_clicked"
      />
    ),
    [feedId, searchQuery, title],
  );

  const keyExtractor = useCallback(
    (item: unknown, index: number) => {
      switch (feedId) {
        case 'tokens':
        case 'stocks':
          return `${feedId}-${(item as TrendingAsset).assetId ?? index}`;
        case 'perps':
          return `${feedId}-${(item as PerpsMarketData).symbol ?? index}`;
        case 'predictions':
          return `${feedId}-${(item as PredictMarketType).id ?? index}`;
        case 'sites':
          return `${feedId}-${(item as SiteData).url ?? index}`;
      }
    },
    [feedId],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && fetchMore) {
      fetchMore();
    }
  }, [hasMore, fetchMore]);

  const footer = (
    <>
      {isFetchingMore && (
        <ActivityIndicator
          style={tw.style('py-4')}
          accessibilityLabel="Loading more results"
        />
      )}
      {feedId === 'sites' && <SitesSearchFooter searchQuery={searchQuery} />}
    </>
  );

  return (
    <FlashList
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
  );
};

interface ExploreSearchV2ContentProps {
  searchQuery: string;
}

/**
 * Renders the pill filter row and content pane for the V2 search experience.
 * Must be a child of PerpsSectionProvider because useExploreSearchV2
 * internally calls usePerpsFeed, which requires PerpsStreamProvider.
 *
 * A single useExploreSearchV2 instance is shared across the pill row and the
 * active content pane, so switching pills never triggers new API calls.
 */
const ExploreSearchV2Content: React.FC<ExploreSearchV2ContentProps> = ({
  searchQuery,
}) => {
  const [activePill, setActivePill] = useState<ActivePill>(ALL_PILL_KEY);

  const { sections } = useExploreSearchV2(searchQuery);

  useEffect(() => {
    if (!searchQuery) {
      setActivePill(ALL_PILL_KEY);
    }
  }, [searchQuery]);

  const pills = useMemo<PillOption[]>(() => {
    const feedPills: PillOption[] = sections.map((section) => ({
      key: section.feedId,
      name: section.title,
    }));
    return [
      { key: ALL_PILL_KEY, name: strings('trending.search_tabs.all') },
      ...feedPills,
    ];
  }, [sections]);

  const activeSection = useMemo(
    () => sections.find((s) => s.feedId === activePill),
    [sections, activePill],
  );

  const handlePillSelect = useCallback((key: string) => {
    setActivePill(key as ActivePill);
  }, []);

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
      {activePill === ALL_PILL_KEY ? (
        <ExploreSearchResultsV2
          searchQuery={searchQuery}
          sections={sections}
          onViewMore={handlePillSelect}
        />
      ) : (
        <FullFeedList
          feedId={activePill}
          searchQuery={searchQuery}
          data={activeSection?.items ?? []}
          title={activeSection?.title ?? activePill}
          fetchMore={activeSection?.fetchMore}
          isFetchingMore={activeSection?.isFetchingMore}
          hasMore={activeSection?.hasMore}
        />
      )}
    </Box>
  );
};

const ExploreSearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const isExploreSearchV2Enabled = useSelector(
    selectExploreSearchV2EnabledFlag,
  );

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
        {isExploreSearchV2Enabled ? (
          <ExploreSearchV2Content searchQuery={searchQuery} />
        ) : (
          <ExploreSearchResults searchQuery={searchQuery} />
        )}
      </PerpsSectionProvider>
    </Box>
  );
};

export default ExploreSearchScreen;
