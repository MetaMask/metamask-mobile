import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  SECTIONS_CONFIG,
  SECTIONS_ARRAY,
  type SectionId,
} from '../../../config/sections.config';
import { useExploreSearch } from './config/useExploreSearch';

function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}
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

  const handlePressFooterLink = useCallback(
    (url: string) => {
      navigation.navigate('TrendingBrowser', {
        newTabUrl: url,
        timestamp: Date.now(),
        fromTrending: true,
      });
    },
    [navigation],
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

    SECTIONS_ARRAY.forEach((section) => {
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

  // Scroll to top when search query changes
  useEffect(() => {
    if (flatData.length > 0) {
      flashListRef.current?.scrollToIndex({
        index: 0,
        animated: false,
      });
    }
  }, [searchQuery, flatData.length]);

  const finishedLoading = useMemo(
    () => Object.values(isLoading).every((value) => !value),
    [isLoading],
  );

  const renderFooter = useMemo(() => {
    if (!finishedLoading || searchQuery.length === 0) return null;

    const isUrl = looksLikeUrl(searchQuery.toLowerCase());

    return (
      <Box>
        {isUrl && (
          <TouchableOpacity
            style={tw.style('flex-row items-center justify-center py-4 px-4')}
            onPress={() => handlePressFooterLink(searchQuery)}
            testID="trending-search-footer-url-link"
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="flex-1 text-primary"
              numberOfLines={1}
            >
              {searchQuery}
            </Text>
            <Icon
              name={IconName.Arrow2UpRight}
              size={IconSize.Md}
              twClassName="text-primary"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={tw.style('flex-row items-center justify-center py-4 px-4')}
          onPress={() =>
            handlePressFooterLink(
              `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
            )
          }
          testID="trending-search-footer-google-link"
        >
          <Box twClassName="flex-1 flex-row items-center">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary shrink-0"
            >
              Search for {'"'}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary shrink"
              numberOfLines={1}
            >
              {searchQuery}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary mr-2 shrink-0"
            >
              {'"'} on Google
            </Text>
          </Box>
          <Icon
            name={IconName.Arrow2UpRight}
            size={IconSize.Md}
            twClassName="text-primary"
          />
        </TouchableOpacity>
      </Box>
    );
  }, [finishedLoading, searchQuery, handlePressFooterLink, tw]);

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
    return section ? section.keyExtractor(item.data) : `item-${index}`;
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
