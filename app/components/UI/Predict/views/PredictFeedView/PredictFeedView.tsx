import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  TabItem,
  TabsBar,
} from '../../../../../component-library/components-temp/Tabs';
import PredictMarket from '../../components/PredictMarket';
import PredictMarketSkeleton from '../../components/PredictMarketSkeleton';
import PredictOffline from '../../components/PredictOffline';
import PredictChipList from '../../components/PredictChipList';
import PredictSearchOverlay from '../../components/PredictSearchOverlay';
import { usePredictFeedConfig } from '../../hooks/usePredictFeedConfig';
import { usePredictMarketList } from '../../hooks/usePredictMarketList';
import { usePredictSearch } from '../../hooks/usePredictSearch';
import {
  PredictFeedViewSelectorsIDs,
  getPredictFeedViewSelector,
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
} from '../../Predict.testIds';
import type { PredictNavigationParamList } from '../../types/navigation';
import type { PredictMarket as PredictMarketType } from '../../types';

const INITIAL_SKELETON_COUNT = 4;

/**
 * Generic, config-driven Predict feed screen.
 *
 * Powers every configured feed (Sports / Politics / Crypto / Live / Trending /
 * Popular Today) from one component. Presentational: it consumes
 * `usePredictFeedConfig` for the render-ready config + tab/filter selection
 * state and `usePredictMarketList` for the active tab/filter's market data —
 * it owns no hydration/dedup/fallback logic itself.
 */
const PredictFeedView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictFeed'>>();
  const { feedId, initialTabId, initialFilterId, entryPoint } =
    route.params ?? {};
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;

  const {
    status,
    titleKey,
    header,
    tabs,
    showTabBar,
    activeTabId,
    setActiveTabId,
    filters,
    activeFilterId,
    setActiveFilterId,
    activeFilter,
  } = usePredictFeedConfig(feedId, { initialTabId, initialFilterId });

  const isReady = status === 'ready';

  const {
    isSearchVisible,
    searchQuery,
    setSearchQuery,
    showSearch,
    clearSearchAndClose,
  } = usePredictSearch();

  const {
    markets,
    isLoading,
    isFetchingNextPage,
    error,
    hasNextPage,
    refetch,
    fetchNextPage,
  } = usePredictMarketList(activeFilter?.params ?? {}, { enabled: isReady });

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.PREDICT.ROOT);
  }, [navigation]);

  // Unknown feed -> bounce back so the user never lands on an empty shell.
  useEffect(() => {
    if (status === 'not-found') {
      handleBack();
    }
  }, [status, handleBack]);

  const tabItems = useMemo<TabItem[]>(
    () =>
      tabs.map((tab) => ({
        key: tab.id,
        label: strings(tab.titleKey),
        content: null,
      })),
    [tabs],
  );

  const activeIndex = useMemo(() => {
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    return index === -1 ? 0 : index;
  }, [tabs, activeTabId]);

  const handleTabPress = useCallback(
    (index: number) => {
      const tab = tabs[index];
      if (tab) {
        setActiveTabId(tab.id);
      }
    },
    [tabs, setActiveTabId],
  );

  const chips = useMemo(
    () =>
      filters.map((filter) => ({
        key: filter.id,
        label: filter.titleKey
          ? strings(filter.titleKey)
          : (filter.label ?? ''),
      })),
    [filters],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: PredictMarketType; index: number }) => (
      <PredictMarket
        market={item}
        entryPoint={entryPoint}
        testID={getPredictFeedViewSelector.marketCard(index + 1)}
        predictFeedTab={activeTabId}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    ),
    [entryPoint, activeTabId, transactionActiveAbTests],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) {
      return null;
    }
    return (
      <Box twClassName="py-2">
        <PredictMarketSkeleton
          testID={getPredictFeedViewSelector.skeletonFooter(1)}
        />
      </Box>
    );
  }, [isFetchingNextPage]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box twClassName="flex-1 px-4">
          {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, index) => (
            <PredictMarketSkeleton
              key={`skeleton-${index}`}
              testID={getPredictFeedViewSelector.skeleton(index + 1)}
            />
          ))}
        </Box>
      );
    }

    // Only take over the whole screen with the error/retry state when nothing
    // has loaded yet. A failed *next-page* fetch must not discard the markets
    // (and scroll position) already on screen, so when markets exist we fall
    // through to the list and let pagination retry on the next scroll.
    if (error && markets.length === 0) {
      return (
        <Box
          twClassName="flex-1"
          testID={PredictFeedViewSelectorsIDs.ERROR_STATE}
        >
          <PredictOffline onRetry={refetch} />
        </Box>
      );
    }

    if (markets.length === 0) {
      return (
        <Box
          twClassName="flex-1 justify-center items-center p-8"
          testID={PredictFeedViewSelectorsIDs.EMPTY_STATE}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.PrimaryAlternative}
          >
            {strings('predict.search_empty_state', {
              category: titleKey ? strings(titleKey) : '',
            })}
          </Text>
        </Box>
      );
    }

    return (
      // flex-1 wrapper so FlashList gets a bounded height in this column layout;
      // without it the list can collapse to zero height and break scroll/pagination.
      <Box twClassName="flex-1">
        <FlashList
          testID={PredictFeedViewSelectorsIDs.MARKET_LIST}
          data={markets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.7}
          ListFooterComponent={renderFooter}
          contentContainerStyle={tw.style('px-4 pb-4')}
          showsVerticalScrollIndicator={false}
        />
      </Box>
    );
  };

  // Unknown feed: render nothing while the effect navigates away.
  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={PredictFeedViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={titleKey ? strings(titleKey) : undefined}
        onBack={header?.showBackButton ? handleBack : undefined}
        backButtonProps={{ testID: PredictMarketListSelectorsIDs.BACK_BUTTON }}
        endButtonIconProps={
          header?.showSearchButton
            ? [
                {
                  iconName: IconName.Search,
                  onPress: showSearch,
                  testID: PredictSearchSelectorsIDs.SEARCH_BUTTON,
                },
              ]
            : undefined
        }
        testID={PredictFeedViewSelectorsIDs.HEADER}
      />

      <Box twClassName="flex-1">
        {showTabBar && (
          <TabsBar
            tabs={tabItems}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
            testID={PredictFeedViewSelectorsIDs.TABS}
          />
        )}

        <PredictChipList
          chips={chips}
          activeChipKey={activeFilterId ?? ''}
          onChipSelect={setActiveFilterId}
          testID={PredictFeedViewSelectorsIDs.FILTERS}
        />

        {renderContent()}
      </Box>

      <PredictSearchOverlay
        isVisible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClose={clearSearchAndClose}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    </SafeAreaView>
  );
};

export default PredictFeedView;
