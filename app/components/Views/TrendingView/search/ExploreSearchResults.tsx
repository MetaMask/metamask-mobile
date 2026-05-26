import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import SitesSearchFooter from '../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useSearchTracking } from '../../../UI/Trending/hooks/useSearchTracking/useSearchTracking';
import { TimeOption } from '../../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { trackExploreSearchEvent, useScrollTracking } from './analytics';
import { useExploreSearch, type SearchFeedSection } from './useExploreSearch';
import SearchFeedRow, { SearchFeedSkeleton, getItemId } from './SearchFeedRow';
import { MAX_ITEMS_PER_SECTION } from './viewMoreLabel';
import type { FlatListItem, ListItemHeader } from './searchTypes';

const pressedStyle = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

interface ExploreSearchResultsProps {
  searchQuery: string;
}

const ExploreSearchResults: React.FC<ExploreSearchResultsProps> = ({
  searchQuery,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { sections } = useExploreSearch(searchQuery, {
    truncateWithoutQuery: true,
    titleVariant: 'v1',
  });
  const flashListRef = useRef<FlashListRef<FlatListItem>>(null);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { onScrollBeginDrag, resetScrollTracking } = useScrollTracking(
    'scrolled',
    searchQuery,
    { tab_name: 'all' },
  );

  useEffect(() => {
    resetScrollTracking();
  }, [searchQuery, resetScrollTracking]);

  const handleViewMore = useCallback(
    (section: SearchFeedSection) => {
      trackExploreSearchEvent({
        interaction_type: 'tab_switched',
        search_query: searchQuery,
        tab_name: section.feedId,
        previous_tab: 'all',
        comes_from_view_all_tap: true,
      });
      navigation.navigate(Routes.EXPLORE_SECTION_RESULTS_FULL_VIEW, {
        feedId: section.feedId,
        title: section.title,
        searchQuery,
        data: section.items,
      });
    },
    [navigation, searchQuery],
  );

  const renderSectionHeader = useCallback(
    (item: ListItemHeader, section: SearchFeedSection) => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-2 bg-default"
      >
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Medium}
          twClassName="text-alternative"
        >
          {item.title}
        </Text>
        {item.hasMore && (
          <Pressable
            onPress={() => handleViewMore(section)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${strings('trending.view_all')} ${item.title}`}
            style={({ pressed }) => [
              pressedStyle.pressable,
              pressed && { opacity: 0.5 },
            ]}
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
    [handleViewMore],
  );

  const flatData = useMemo<FlatListItem[]>(() => {
    const result: FlatListItem[] = [];
    const visibleSections = isBasicFunctionalityEnabled ? sections : [];

    visibleSections.forEach((section) => {
      const { feedId, title, items, isLoading } = section;
      if (!isLoading && items.length === 0) return;

      const hasMore = !isLoading && items.length > MAX_ITEMS_PER_SECTION;
      result.push({ type: 'header', feedId, title, hasMore });

      if (isLoading) {
        for (let i = 0; i < MAX_ITEMS_PER_SECTION; i++) {
          result.push({ type: 'skeleton', feedId, index: i });
        }
      } else {
        items.slice(0, MAX_ITEMS_PER_SECTION).forEach((data, sectionIndex) => {
          result.push({ type: 'item', feedId, title, data, sectionIndex });
        });
      }
    });

    return result;
  }, [isBasicFunctionalityEnabled, sections]);

  useEffect(() => {
    if (flatData.length > 0) {
      flashListRef.current?.scrollToIndex({ index: 0, animated: false });
    }
  }, [searchQuery, flatData.length]);

  const tokensSection = sections.find((s) => s.feedId === 'tokens');
  useSearchTracking({
    searchQuery,
    resultsCount:
      (tokensSection?.items as TrendingAsset[] | undefined)?.length ?? 0,
    isLoading: tokensSection?.isLoading ?? false,
    timeFilter: TimeOption.TwentyFourHours,
    sortOption: 'relevance',
    networkFilter: 'all',
  });

  const renderFooter =
    searchQuery.length > 0 ? (
      <SitesSearchFooter searchQuery={searchQuery} />
    ) : null;

  const renderFlatItem: ListRenderItem<FlatListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'header') {
        const section = sections.find((s) => s.feedId === item.feedId);
        if (!section) return null;
        return renderSectionHeader(item, section);
      }
      if (item.type === 'skeleton') {
        return <SearchFeedSkeleton feedId={item.feedId} />;
      }
      return (
        <SearchFeedRow
          feedId={item.feedId}
          item={item.data}
          index={item.sectionIndex}
          searchQuery={searchQuery}
          tabName="all"
        />
      );
    },
    [renderSectionHeader, sections, searchQuery],
  );

  const keyExtractor = useCallback((item: FlatListItem) => {
    if (item.type === 'header') return `header-${item.feedId}`;
    if (item.type === 'skeleton')
      return `skeleton-${item.feedId}-${item.index}`;
    return `${item.feedId}-${getItemId(item.feedId, item.data)}`;
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
