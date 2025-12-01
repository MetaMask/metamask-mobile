import React, { useMemo, useCallback } from 'react';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  SEARCH_SECTION_ARRAY,
  type SectionId,
} from './config/exploreSearchConfig';
import { useExploreSearch } from './config/useExploreSearch';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
  },
});

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
  const { data, isLoading } = useExploreSearch(searchQuery);

  // Helper to get section config by id
  const getSectionById = useCallback(
    (sectionId: SectionId) =>
      SEARCH_SECTION_ARRAY.find((s) => s.id === sectionId),
    [],
  );

  const renderSectionHeader = useCallback(
    (title: string) => (
      <Box twClassName="py-2 bg-default">
        <Text variant={TextVariant.HeadingSm} twClassName="text-muted">
          {title}
        </Text>
      </Box>
    ),
    [],
  );

  // Build flat list data with sections
  const flatData = useMemo(() => {
    const result: FlatListItem[] = [];

    SEARCH_SECTION_ARRAY.forEach((section) => {
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
  }, [data, isLoading]);

  const renderFlatItem: ListRenderItem<FlatListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'header') {
        return renderSectionHeader(item.data);
      }

      const section = getSectionById(item.sectionId);
      if (!section) return null;

      if (item.type === 'skeleton') {
        return section.renderSkeleton();
      }

      // Get the onPress handler from the section config if it exists
      // Cast navigation to 'never' to satisfy different navigation param list types
      const onPressHandler = section.getOnPressHandler?.(navigation as never);
      return section.renderItem(item.data as never, onPressHandler as never);
    },
    [navigation, getSectionById, renderSectionHeader],
  );

  const keyExtractor = useCallback(
    (item: FlatListItem, index: number) => {
      if (item.type === 'header') return `header-${item.data}`;
      if (item.type === 'skeleton')
        return `skeleton-${item.sectionId}-${item.index}`;

      const section = getSectionById(item.sectionId);
      return section
        ? section.keyExtractor(item.data as never)
        : `item-${index}`;
    },
    [getSectionById],
  );

  if (flatData.length === 0) {
    return (
      <Box
        twClassName="flex-1 items-center justify-center px-5 py-10"
        alignItems={BoxAlignItems.Center}
      >
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-muted text-center"
          testID="trending-search-no-results"
        >
          {strings('trending.no_results')}
        </Text>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 bg-default">
      <FlashList
        data={flatData}
        renderItem={renderFlatItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        testID="trending-search-results-list"
      />
    </Box>
  );
};

export default ExploreSearchResults;
