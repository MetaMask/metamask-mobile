import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Pressable } from 'react-native';
import { SECTIONS_CONFIG, type SectionId } from '../../sections.config';
import { useExploreSearch } from '../../hooks/useExploreSearch';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import SitesSearchFooter from '../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useSelector } from 'react-redux';
import { useSearchTracking } from '../../../../UI/Trending/hooks/useSearchTracking/useSearchTracking';
import { TimeOption } from '../../../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const MAX_ITEMS_PER_SECTION = 3;

interface ExploreSearchResultsProps {
  searchQuery: string;
}

interface ListItemHeader {
  type: 'header';
  sectionId: SectionId;
  title: string;
  hasMore: boolean;
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

  const handleViewMore = useCallback(
    (sectionId: SectionId, title: string) => {
      (
        navigation as never as {
          navigate: (
            route: string,
            params: {
              sectionId: SectionId;
              title: string;
              searchQuery: string;
            },
          ) => void;
        }
      ).navigate(Routes.EXPLORE_SECTION_RESULTS_FULL_VIEW, {
        sectionId,
        title,
        searchQuery,
      });
    },
    [navigation, searchQuery],
  );

  const renderSectionHeader = useCallback(
    (item: ListItemHeader) => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-2 bg-default"
      >
        <Text variant={TextVariant.HeadingSm} twClassName="text-alternative">
          {item.title}
        </Text>
        {item.hasMore && (
          <Pressable
            onPress={() => handleViewMore(item.sectionId, item.title)}
            hitSlop={8}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('trending.view_all')}
              </Text>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </Box>
          </Pressable>
        )}
      </Box>
    ),
    [handleViewMore],
  );

  const flatData = useMemo(() => {
    const result: FlatListItem[] = [];

    const sectionIdsToShow = isBasicFunctionalityEnabled ? sectionsOrder : [];

    sectionIdsToShow.forEach((sectionId) => {
      const section = SECTIONS_CONFIG[sectionId];
      if (!section) return;

      const items = data[sectionId];
      const sectionIsLoading = isLoading[sectionId];

      if ((items && items.length > 0) || sectionIsLoading) {
        const hasMore =
          !sectionIsLoading && items.length > MAX_ITEMS_PER_SECTION;

        result.push({
          type: 'header',
          sectionId,
          title: section.title,
          hasMore,
        });

        if (sectionIsLoading) {
          for (let i = 0; i < MAX_ITEMS_PER_SECTION; i++) {
            result.push({
              type: 'skeleton',
              sectionId,
              index: i,
            });
          }
        } else {
          const visibleItems = items.slice(0, MAX_ITEMS_PER_SECTION);
          visibleItems.forEach((item) => {
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

  useEffect(() => {
    if (flatData.length > 0) {
      flashListRef.current?.scrollToIndex({
        index: 0,
        animated: false,
      });
    }
  }, [searchQuery, flatData.length]);

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
        return renderSectionHeader(item);
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
    if (item.type === 'header') return `header-${item.sectionId}`;
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
