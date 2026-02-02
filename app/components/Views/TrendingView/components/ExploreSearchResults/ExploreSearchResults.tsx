import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SECTIONS_CONFIG, type SectionId } from '../../sections.config';
import { useExploreSearch } from '../../hooks/useExploreSearch';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import SitesSearchFooter from '../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useSelector } from 'react-redux';
import { useSearchTracking } from '../../../../UI/Trending/hooks/useSearchTracking/useSearchTracking';
import { TimeOption } from '../../../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';

interface ExploreSearchResultsProps {
  searchQuery: string;
}

interface ListItemHeader {
  type: 'header';
  data: string;
}

interface ListItemData {
  type: 'item';
  sectionId: SectionId;
  data: unknown;
}

interface ListItemSkeleton {
  type: 'skeleton';
  sectionId: SectionId;
  index: number;
}

type FlatListItem = ListItemHeader | ListItemData | ListItemSkeleton;

const ExploreSearchResults: React.FC<ExploreSearchResultsProps> = ({
  searchQuery,
}) => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { data, isLoading, sectionsOrder } = useExploreSearch(searchQuery);
  const flashListRef = useRef<FlashListRef<FlatListItem>>(null);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const renderSectionHeader = useCallback(
    (title: string) => (
      <Box twClassName="py-2 bg-default">
        <Text variant={TextVariant.HeadingSm} twClassName="text-alternative">
          {title}
        </Text>
      </Box>
    ),
    [],
  );

  // Build flat list data with sections
  const flatData = useMemo(() => {
    const result: FlatListItem[] = [];

    // Filter sections based on basic functionality toggle
    const sectionIdsToShow = isBasicFunctionalityEnabled ? sectionsOrder : [];

    sectionIdsToShow.forEach((sectionId) => {
      const section = SECTIONS_CONFIG[sectionId];
      if (!section) return;

      const items = data[sectionId];
      const sectionIsLoading = isLoading[sectionId];

      // Show section if it has items or is loading
      if ((items && items.length > 0) || sectionIsLoading) {
        // Add section header
        result.push({
          type: 'header',
          data: section.title,
        });

        if (sectionIsLoading) {
          // Show 3 skeleton items while loading
          for (let i = 0; i < 3; i++) {
            result.push({
              type: 'skeleton',
              sectionId,
              index: i,
            });
          }
        } else {
          // Add section items
          items.forEach((item) => {
            result.push({
              type: 'item',
              sectionId,
              data: item,
            });
          });
        }
      }
    });

    return result;
  }, [data, isLoading, isBasicFunctionalityEnabled, sectionsOrder]);

  // Scroll to top when search query changes
  useEffect(() => {
    if (flatData.length > 0) {
      flashListRef.current?.scrollToIndex({
        index: 0,
        animated: false,
      });
    }
  }, [searchQuery, flatData.length]);

  // Track search events for tokens section
  useSearchTracking({
    searchQuery,
    resultsCount: data.tokens?.length || 0,
    isLoading: isLoading.tokens,
    timeFilter: TimeOption.TwentyFourHours,
    sortOption: 'relevance',
    networkFilter: 'all',
  });

  const renderFooter = useMemo(() => {
    if (searchQuery.length === 0) return null;

    return <SitesSearchFooter searchQuery={searchQuery} />;
  }, [searchQuery]);

  const renderFlatItem: ListRenderItem<FlatListItem> = useCallback(
    ({ item, index }) => {
      if (item.type === 'header') {
        return renderSectionHeader(item.data);
      }

      const section = SECTIONS_CONFIG[item.sectionId];
      if (!section) return null;

      if (item.type === 'skeleton') {
        if (section.OverrideSkeletonSearch) {
          return <section.OverrideSkeletonSearch />;
        }
        return <section.Skeleton />;
      }

      if (section.OverrideRowItemSearch) {
        return (
          <section.OverrideRowItemSearch
            item={item.data}
            index={index}
            navigation={navigation}
          />
        );
      }

      // Cast navigation to 'never' to satisfy different navigation param list types
      return (
        <section.RowItem
          item={item.data}
          index={index}
          navigation={navigation}
        />
      );
    },
    [navigation, renderSectionHeader],
  );

  const keyExtractor = useCallback((item: FlatListItem, index: number) => {
    if (item.type === 'header') return `header-${item.data}`;
    if (item.type === 'skeleton')
      return `skeleton-${item.sectionId}-${item.index}`;

    const section = SECTIONS_CONFIG[item.sectionId];
    return section ? `${section.id}-${index}` : `item-${index}`;
  }, []);

  return (
    <Box twClassName="flex-1 bg-default">
      <FlashList
        ref={flashListRef}
        data={flatData}
        renderItem={renderFlatItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={tw.style('px-4')}
        showsVerticalScrollIndicator={false}
        testID="trending-search-results-list"
        ListFooterComponent={renderFooter}
      />
    </Box>
  );
};

export default ExploreSearchResults;
