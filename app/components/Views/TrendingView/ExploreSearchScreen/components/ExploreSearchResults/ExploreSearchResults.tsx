import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  SECTIONS_CONFIG,
  SECTIONS_ARRAY,
  type SectionId,
} from '../../../config/sections.config';
import { useExploreSearch } from './config/useExploreSearch';
import { selectBasicFunctionalityEnabled } from '../../../../../../selectors/settings';
import SitesSearchFooter from '../../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useSelector } from 'react-redux';

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
  const { data, isLoading } = useExploreSearch(searchQuery);
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
    const sectionsToShow = isBasicFunctionalityEnabled ? SECTIONS_ARRAY : [];

    sectionsToShow.forEach((section) => {
      const items = data[section.id];
      const sectionIsLoading = isLoading[section.id];

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
              sectionId: section.id,
              index: i,
            });
          }
        } else {
          // Add section items
          items.forEach((item) => {
            result.push({
              type: 'item',
              sectionId: section.id,
              data: item,
            });
          });
        }
      }
    });

    return result;
  }, [data, isLoading, isBasicFunctionalityEnabled]);

  // Scroll to top when search query changes
  useEffect(() => {
    if (flatData.length > 0) {
      flashListRef.current?.scrollToIndex({
        index: 0,
        animated: false,
      });
    }
  }, [searchQuery, flatData.length]);

  const renderFooter = useMemo(() => {
    if (searchQuery.length === 0) return null;

    return <SitesSearchFooter searchQuery={searchQuery} />;
  }, [searchQuery]);

  const renderFlatItem: ListRenderItem<FlatListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'header') {
        return renderSectionHeader(item.data);
      }

      const section = SECTIONS_CONFIG[item.sectionId];
      if (!section) return null;

      if (item.type === 'skeleton') {
        return <section.Skeleton />;
      }

      if (section.OverrideRowItemSearch) {
        return (
          <section.OverrideRowItemSearch
            item={item.data}
            navigation={navigation}
          />
        );
      }

      // Cast navigation to 'never' to satisfy different navigation param list types
      return <section.RowItem item={item.data} navigation={navigation} />;
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
