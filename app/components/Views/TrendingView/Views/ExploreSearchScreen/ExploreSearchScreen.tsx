import React, { useCallback, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
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
import TabsList from '../../../../../component-library/components-temp/Tabs/TabsList/TabsList';
import {
  type TabsListRef,
  type TabViewProps,
} from '../../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import ExploreSearchBar from '../../components/ExploreSearchBar/ExploreSearchBar';
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

const FEED_TAB_INDEX: Record<SearchFeedId, number> = {
  tokens: 1,
  perps: 2,
  stocks: 3,
  predictions: 4,
  sites: 5,
};

interface FullFeedListProps {
  feedId: SearchFeedId;
  searchQuery: string;
  data: unknown[];
  title: string;
}

const FullFeedList: React.FC<FullFeedListProps> = ({
  feedId,
  searchQuery,
  data,
  title,
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

  const footer =
    feedId === 'sites' ? <SitesSearchFooter searchQuery={searchQuery} /> : null;

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
      ListFooterComponent={footer}
    />
  );
};

interface FeedTabProps {
  feedId: SearchFeedId;
  searchQuery: string;
  title: string;
}

const FeedTab: React.FC<FeedTabProps> = ({ feedId, searchQuery, title }) => {
  const { sections } = useExploreSearchV2(searchQuery);
  const section = sections.find((s) => s.feedId === feedId);

  return (
    <FullFeedList
      feedId={feedId}
      searchQuery={searchQuery}
      data={section?.items ?? []}
      title={title}
    />
  );
};

const ExploreSearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const tw = useTailwind();
  const [searchQuery, setSearchQuery] = useState('');
  const tabsListRef = useRef<TabsListRef>(null);
  const isExploreSearchV2Enabled = useSelector(
    selectExploreSearchV2EnabledFlag,
  );

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  const handleViewMore = useCallback((feedId: SearchFeedId) => {
    tabsListRef.current?.goToTabIndex(FEED_TAB_INDEX[feedId]);
  }, []);

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
          <TabsList
            ref={tabsListRef}
            tabsListContentTwClassName="px-0 pb-3"
            style={tw.style('flex-1')}
          >
            <Box
              key="all"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.search_tabs.all'),
              } as TabViewProps)}
            >
              <ExploreSearchResultsV2
                searchQuery={searchQuery}
                onViewMore={handleViewMore}
              />
            </Box>
            <Box
              key="crypto"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.search_tabs.crypto'),
              } as TabViewProps)}
            >
              <FeedTab
                feedId="tokens"
                searchQuery={searchQuery}
                title={strings('trending.search_tabs.crypto')}
              />
            </Box>
            <Box
              key="perps"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.search_tabs.perps'),
              } as TabViewProps)}
            >
              <FeedTab
                feedId="perps"
                searchQuery={searchQuery}
                title={strings('trending.search_tabs.perps')}
              />
            </Box>
            <Box
              key="stocks"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.search_tabs.stocks'),
              } as TabViewProps)}
            >
              <FeedTab
                feedId="stocks"
                searchQuery={searchQuery}
                title={strings('trending.search_tabs.stocks')}
              />
            </Box>
            <Box
              key="predictions"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.search_tabs.predictions'),
              } as TabViewProps)}
            >
              <FeedTab
                feedId="predictions"
                searchQuery={searchQuery}
                title={strings('trending.search_tabs.predictions')}
              />
            </Box>
            <Box
              key="sites"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.search_tabs.sites'),
              } as TabViewProps)}
            >
              <FeedTab
                feedId="sites"
                searchQuery={searchQuery}
                title={strings('trending.search_tabs.sites')}
              />
            </Box>
          </TabsList>
        ) : (
          <ExploreSearchResults searchQuery={searchQuery} />
        )}
      </PerpsSectionProvider>
    </Box>
  );
};

export default ExploreSearchScreen;
