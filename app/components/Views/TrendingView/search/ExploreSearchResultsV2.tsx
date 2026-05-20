import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  TabEmptyState,
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
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import SitesSearchFooter from '../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useSearchTracking } from '../../../UI/Trending/hooks/useSearchTracking/useSearchTracking';
import { TimeOption } from '../../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet';
import { strings } from '../../../../../locales/i18n';
import {
  trackExploreSearchEvent,
  useScrollTracking,
  type SearchFeedPill,
} from './analytics';
import { type SearchFeedId, type SearchFeedSection } from './useExploreSearch';
import SearchFeedRow, { SearchFeedSkeleton, getItemId } from './SearchFeedRow';
import { MAX_ITEMS_PER_SECTION, getViewMoreLabel } from './viewMoreLabel';
import type { FlatListItem, ListItemHeader } from './searchTypes';

const pressedStyle = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

interface ExploreSearchResultsV2Props {
  searchQuery: string;
  sections: SearchFeedSection[];
  onViewMore: (feedId: SearchFeedId) => void;
  /** When set, renders a "No {title} found" header above the all-results list. */
  emptyFeedTitle?: string;
  /**
   * The pill that was active when this component was rendered.
   * Defaults to 'all'. When an empty-feed fallback is shown (emptyFeedTitle is
   * set), this will be the specific feed pill the user tapped — analytics must
   * reflect that, not 'all'.
   */
  activeTab?: SearchFeedPill;
}

const ExploreSearchResultsV2: React.FC<ExploreSearchResultsV2Props> = ({
  searchQuery,
  sections,
  onViewMore,
  emptyFeedTitle,
  activeTab = 'all',
}) => {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<FlatListItem>>(null);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { onScrollBeginDrag, resetScrollTracking } = useScrollTracking(
    'scrolled',
    searchQuery,
    { tab_name: activeTab },
  );

  useEffect(() => {
    resetScrollTracking();
  }, [searchQuery, activeTab, resetScrollTracking]);

  const handleViewMore = useCallback(
    (section: SearchFeedSection) => {
      trackExploreSearchEvent({
        interaction_type: 'tab_switched',
        search_query: searchQuery,
        tab_name: section.feedId,
        previous_tab: activeTab,
        comes_from_view_all_tap: true,
      });
      onViewMore(section.feedId);
    },
    [onViewMore, searchQuery, activeTab],
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
        <Pressable
          onPress={() => handleViewMore(section)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${getViewMoreLabel(section.feedId, section.items.length, searchQuery, section.total)} ${item.title}`}
          style={({ pressed }) => [
            pressedStyle.pressable,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {getViewMoreLabel(
              section.feedId,
              section.items.length,
              searchQuery,
              section.total,
            )}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Pressable>
      </Box>
    ),
    [handleViewMore, searchQuery],
  );

  const flatData = useMemo<FlatListItem[]>(() => {
    const result: FlatListItem[] = [];
    const visibleSections = isBasicFunctionalityEnabled ? sections : [];

    visibleSections.forEach((section) => {
      const { feedId, title, items, isLoading } = section;
      if (!isLoading && items.length === 0) return;

      result.push({ type: 'header', feedId, title });

      if (isLoading) {
        for (let i = 0; i < MAX_ITEMS_PER_SECTION; i++) {
          result.push({ type: 'skeleton', feedId, index: i });
        }
      } else {
        const visibleItems = items.slice(0, MAX_ITEMS_PER_SECTION);
        visibleItems.forEach((data, sectionIndex) => {
          result.push({ type: 'item', feedId, title, data, sectionIndex });
        });
      }
    });

    return result;
  }, [isBasicFunctionalityEnabled, sections]);

  useEffect(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery, flatData.length, emptyFeedTitle]);

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
          tabName={activeTab}
        />
      );
    },
    [renderSectionHeader, sections, searchQuery, activeTab],
  );

  const keyExtractor = useCallback((item: FlatListItem) => {
    if (item.type === 'header') return `header-${item.feedId}`;
    if (item.type === 'skeleton')
      return `skeleton-${item.feedId}-${item.index}`;
    return `${item.feedId}-${getItemId(item.feedId, item.data)}`;
  }, []);

  const listHeader = useMemo(() => {
    if (!emptyFeedTitle) return null;
    return (
      <Box twClassName="mb-4">
        <Box twClassName="rounded-xl bg-secondary py-6 px-4 items-center mb-4">
          <TabEmptyState
            description={strings('trending.no_results_for_feed', {
              feedName: emptyFeedTitle,
              query: searchQuery,
            })}
            descriptionProps={{
              variant: TextVariant.BodyMd,
              fontWeight: FontWeight.Bold,
              color: TextColor.TextDefault,
            }}
          />
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('trending.showing_all_results_for', {
            query: searchQuery,
          })}
        </Text>
      </Box>
    );
  }, [emptyFeedTitle, searchQuery]);

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
        ListHeaderComponent={listHeader}
        ListFooterComponent={renderFooter}
        onScrollBeginDrag={onScrollBeginDrag}
      />
    </Box>
  );
};

export default ExploreSearchResultsV2;
