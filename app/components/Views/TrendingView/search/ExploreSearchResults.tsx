import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TabEmptyState,
  Text,
  TextVariant,
  TextColor,
  SectionDivider,
  SectionHeader as MMDSSectionHeader,
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
  getTotalSectionResultCount,
  trackExploreSearchEvent,
  useScrollTracking,
  type SearchFeedPill,
} from './analytics';
import { type SearchFeedId, type SearchFeedSection } from './useExploreSearch';
import SearchFeedRow, { SearchFeedSkeleton, getItemId } from './SearchFeedRow';
import { MAX_ITEMS_PER_SECTION, getViewMoreLabel } from './viewMoreLabel';
import type { FlatListItem, ListItemHeader } from './searchTypes';
import CryptoMoversPillItem from '../feeds/tokens/CryptoMoversPillItem';
import TrendingQuickBuy from '../../../UI/Trending/components/TrendingQuickBuy/TrendingQuickBuy';
import { useABTest } from '../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from './abTestConfig';
import { useQuickBuySearchKeyboard } from '../../../UI/Trending/hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard';

const POPULAR_ASSETS: TrendingAsset[] = [
  {
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    symbol: 'BTC',
    name: 'Bitcoin',
  },
  {
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    name: 'Ethereum',
  },
  {
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    name: 'Solana',
  },
] as TrendingAsset[];

const pressedStyle = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

interface ExploreSearchResultsProps {
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

const ExploreSearchResults: React.FC<ExploreSearchResultsProps> = ({
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

  const totalResultCount = useMemo(
    () => getTotalSectionResultCount(sections),
    [sections],
  );

  const [quickTradeToken, setQuickTradeToken] = useState<TrendingAsset | null>(
    null,
  );

  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );

  const closeQuickBuy = useCallback(() => {
    setQuickTradeToken(null);
  }, []);

  useQuickBuySearchKeyboard(quickTradeToken, closeQuickBuy);

  const { onScrollBeginDrag, resetScrollTracking } = useScrollTracking(
    'scrolled',
    searchQuery,
    { tab_name: activeTab, result_count: totalResultCount },
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
        result_count: section.total ?? section.items.length,
      });
      onViewMore(section.feedId);
    },
    [onViewMore, searchQuery, activeTab],
  );

  const renderSectionHeader = useCallback(
    (item: ListItemHeader, section: SearchFeedSection) => {
      const viewMoreLabel = section.isLoading
        ? null
        : getViewMoreLabel(
            section.feedId,
            section.items.length,
            searchQuery,
            section.total,
          );
      return (
        <Box>
          {!item.isFirstHeader ? <SectionDivider twClassName="-mx-4" /> : null}
          <MMDSSectionHeader
            title={item.title}
            twClassName="px-0"
            titleProps={{
              variant: TextVariant.HeadingSm,
              color: TextColor.TextAlternative,
            }}
            endAccessory={
              viewMoreLabel !== null ? (
                <Pressable
                  onPress={() => handleViewMore(section)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${viewMoreLabel} ${item.title}`}
                  style={({ pressed }) => [
                    pressedStyle.pressable,
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {viewMoreLabel}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Pressable>
              ) : undefined
            }
          />
        </Box>
      );
    },
    [handleViewMore, searchQuery],
  );

  const sectionsMap = useMemo(
    () => new Map(sections.map((s) => [s.feedId, s])),
    [sections],
  );

  const flatData = useMemo<FlatListItem[]>(() => {
    const result: FlatListItem[] = [];
    const visibleSections = isBasicFunctionalityEnabled ? sections : [];
    let headerCount = 0;

    visibleSections.forEach((section) => {
      const { feedId, title, items, isLoading } = section;
      if (!isLoading && items.length === 0) return;

      result.push({
        type: 'header',
        feedId,
        title,
        isFirstHeader: headerCount === 0,
      });
      headerCount += 1;

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
        const section = sectionsMap.get(item.feedId);
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
          resultCount={totalResultCount}
          onQuickTrade={
            (item.feedId === 'tokens' || item.feedId === 'stocks') &&
            quickBuyVariant.showQuickTradeButton
              ? setQuickTradeToken
              : undefined
          }
        />
      );
    },
    [
      renderSectionHeader,
      sectionsMap,
      searchQuery,
      activeTab,
      totalResultCount,
      quickBuyVariant.showQuickTradeButton,
    ],
  );

  const keyExtractor = useCallback((item: FlatListItem) => {
    if (item.type === 'header') return `header-${item.feedId}`;
    if (item.type === 'skeleton')
      return `skeleton-${item.feedId}-${item.index}`;
    return `${item.feedId}-${getItemId(item.feedId, item.data)}`;
  }, []);

  const listHeader = useMemo(() => {
    const isLoading = sections.some((s) => s.isLoading);
    const allSectionsEmpty =
      searchQuery.trim().length > 0 && !isLoading && flatData.length === 0;

    if (!emptyFeedTitle && !allSectionsEmpty) return null;
    const showOtherResults = flatData.length > 0 && !isLoading;
    return (
      <Box twClassName={showOtherResults ? 'mb-4' : ''}>
        <Box twClassName="rounded-xl bg-secondary py-6 px-4 items-center mb-4">
          <TabEmptyState
            description={
              emptyFeedTitle
                ? strings('trending.no_results_for_feed', {
                    feedName: emptyFeedTitle,
                    query: searchQuery,
                  })
                : strings('trending.no_results_for_query', {
                    query: searchQuery,
                  })
            }
            descriptionProps={{
              variant: TextVariant.HeadingSm,
              fontWeight: FontWeight.Bold,
              color: TextColor.TextDefault,
            }}
          />
          {!isLoading && !showOtherResults && (
            <>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('trending.no_results_check_popular')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-2 mt-2"
              >
                {POPULAR_ASSETS.map((token, index) => (
                  <CryptoMoversPillItem
                    key={token.assetId}
                    token={token}
                    index={index}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
        {showOtherResults && (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('trending.showing_all_results_for', {
              count: totalResultCount,
              query: searchQuery,
            })}
          </Text>
        )}
      </Box>
    );
  }, [
    emptyFeedTitle,
    searchQuery,
    flatData.length,
    sections,
    totalResultCount,
  ]);

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
      <TrendingQuickBuy token={quickTradeToken} onClose={closeQuickBuy} />
    </Box>
  );
};

export default ExploreSearchResults;
