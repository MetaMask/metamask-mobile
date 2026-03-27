import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
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
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  TrackedRowItem,
  trackExploreEvent,
  useScrollTracking,
} from '../../utils/exploreSearch';
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { data, isLoading, sectionsOrder } = useExploreSearch(searchQuery);
  const flashListRef = useRef<FlashListRef<FlatListItem>>(null);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { onScrollBeginDrag, resetScrollTracking } = useScrollTracking(
    'scrolled',
    searchQuery,
  );

  useEffect(() => {
    resetScrollTracking();
  }, [searchQuery, resetScrollTracking]);

  const handleViewMore = useCallback(
    (sectionId: SectionId, title: string) => {
      trackExploreEvent(MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED, {
        interaction_type: 'view_all_clicked',
        search_query: searchQuery,
        section_name: title,
      });
      navigation.navigate(Routes.EXPLORE_SECTION_RESULTS_FULL_VIEW, {
        sectionId,
        title,
        searchQuery,
        data: data[sectionId],
      });
    },
    [navigation, searchQuery, data],
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
            accessibilityRole="button"
            accessibilityLabel={`${strings('trending.view_all')} ${item.title}`}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-center gap-1 rounded px-1',
                pressed && 'opacity-50',
              )
            }
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
          </Pressable>
        )}
      </Box>
    ),
    [handleViewMore, tw],
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
          !sectionIsLoading && (items?.length ?? 0) > MAX_ITEMS_PER_SECTION;

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

      return (
        <TrackedRowItem
          section={section}
          item={item.data}
          index={index}
          searchQuery={searchQuery}
          interactionType="result_clicked"
        />
      );
    },
    [renderSectionHeader, searchQuery],
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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        testID="trending-search-results-list"
        ListFooterComponent={renderFooter}
        onScrollBeginDrag={onScrollBeginDrag}
      />
    </Box>
  );
};

export default ExploreSearchResults;
