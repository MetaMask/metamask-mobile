import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  useTailwind,
  Theme,
  ThemeProvider as DesignSystemThemeProvider,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Engine from '../../../../../core/Engine';
import { selectPredictWorldCupConfig } from '../../selectors/featureFlags';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PredictMarket as PredictMarketType } from '../../types';
import {
  PREDICT_WORLD_CUP_HUB_TAB_KEYS,
  buildPredictWorldCupHubTabs,
  resolvePredictWorldCupHubInitialTab,
  type PredictWorldCupHubTab,
  type PredictWorldCupHubTabKey,
} from '../../constants/worldCupHubTabs';
import {
  usePredictWorldCupGamesSections,
  usePredictWorldCupWinnerMarket,
  type PredictWorldCupStageSection,
} from '../../hooks/usePredictWorldCupHub';
import {
  usePredictWorldCupMarkets,
  usePredictWorldCupFeedSession,
} from '../../hooks';
import PredictMarket from '../../components/PredictMarket';
import PredictMarketSkeleton from '../../components/PredictMarketSkeleton';
import PredictOffline from '../../components/PredictOffline';
import PulsingLiveDot from '../../components/PulsingLiveDot/PulsingLiveDot';
import PredictWorldCupWinnerModule from '../../components/PredictWorldCupWinnerModule';
import PredictWorldCupHubBanner from '../../components/PredictWorldCupHubBanner';
import { PredictEventValues } from '../../constants/eventNames';
import { strings } from '../../../../../../locales/i18n';

export const PREDICT_WORLD_CUP_HUB_TEST_IDS = {
  CONTAINER: 'predict-world-cup-hub-screen',
  TABS: 'predict-world-cup-hub-tabs',
  TAB: 'predict-world-cup-hub-tab',
  GAMES_LIST: 'predict-world-cup-hub-games-list',
  PROPS_LIST: 'predict-world-cup-hub-props-list',
  SECTION_HEADER: 'predict-world-cup-hub-section-header',
  MARKET_CARD: 'predict-world-cup-hub-market-card',
  SKELETON: 'predict-world-cup-hub-skeleton',
  EMPTY_STATE: 'predict-world-cup-hub-empty-state',
  ERROR_STATE: 'predict-world-cup-hub-error-state',
} as const;

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

const HubTabButton: React.FC<{
  tab: PredictWorldCupHubTab;
  isActive: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}> = ({ tab, isActive, onPress, onLayout }) => {
  const tw = useTailwind();
  const designSystemTheme = useDesignSystemTheme();
  const inverseTheme =
    designSystemTheme === Theme.Dark ? Theme.Light : Theme.Dark;

  const dotContent = (
    <>
      <PulsingLiveDot color={tw.color('success-default')} />
      <Text
        variant={TextVariant.BodySm}
        style={tw.style('font-medium leading-[22px]', 'text-success-default')}
      >
        {tab.label}
      </Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      style={tw.style(
        'min-w-[51px] flex-row items-center justify-center gap-2 rounded-xl bg-muted p-2',
        isActive && 'bg-icon-default',
      )}
      testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.TAB}-${tab.key}`}
    >
      {tab.hasLiveDot ? (
        isActive ? (
          <DesignSystemThemeProvider theme={inverseTheme}>
            {dotContent}
          </DesignSystemThemeProvider>
        ) : (
          dotContent
        )
      ) : (
        <Text
          color={
            isActive ? TextColor.PrimaryInverse : TextColor.TextAlternative
          }
          variant={TextVariant.BodySm}
          style={tw.style('font-medium leading-[22px]')}
        >
          {tab.label}
        </Text>
      )}
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Games tab — flat FlashList with interleaved section headers
// ---------------------------------------------------------------------------

type GamesListItem =
  | { type: 'header'; key: string; label: string }
  | {
      type: 'market';
      key: string;
      market: PredictMarketType;
      stageKey: string;
    };

interface GamesTabContentProps {
  sections: PredictWorldCupStageSection[];
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  entryPoint?: PredictEntryPoint;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const GamesTabContent: React.FC<GamesTabContentProps> = ({
  sections,
  isFetching,
  error,
  refetch,
  entryPoint,
  transactionActiveAbTests,
}) => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const items = useMemo<GamesListItem[]>(() => {
    const list: GamesListItem[] = [];
    for (const section of sections) {
      list.push({
        type: 'header',
        key: `header-${section.key}`,
        label: section.label,
      });
      for (const market of section.markets) {
        list.push({
          type: 'market',
          key: market.id,
          market,
          stageKey: section.key,
        });
      }
    }
    return list;
  }, [sections]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: GamesListItem; index: number }) => {
      if (item.type === 'header') {
        return (
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.TextDefault}
            style={tw.style('font-medium px-4 pt-4 pb-2')}
            testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SECTION_HEADER}-${item.key}`}
          >
            {item.label}
          </Text>
        );
      }
      return (
        <Box twClassName="px-4">
          <PredictMarket
            market={item.market}
            entryPoint={entryPoint}
            testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.MARKET_CARD}-${index}`}
            predictFeedTab={PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES}
            predictScreen={PredictEventValues.PREDICT_SCREEN.WORLD_CUP}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        </Box>
      );
    },
    [entryPoint, transactionActiveAbTests, tw],
  );

  const keyExtractor = useCallback((item: GamesListItem) => item.key, []);

  const getItemType = useCallback((item: GamesListItem) => item.type, []);

  if (isFetching && !isRefreshing && sections.length === 0) {
    return (
      <Box twClassName="flex-1 px-4">
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-1`}
        />
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-2`}
        />
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-3`}
        />
      </Box>
    );
  }

  if (error && sections.length === 0) {
    return (
      <Box
        twClassName="flex-1"
        testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.ERROR_STATE}
      >
        <PredictOffline onRetry={handleRefresh} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box
        twClassName="flex-1 justify-center items-center p-8"
        testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.EMPTY_STATE}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryAlternative}>
          {strings('predict.search_empty_state', {
            category: strings('predict.world_cup.title'),
          })}
        </Text>
      </Box>
    );
  }

  return (
    <FlashList
      testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.GAMES_LIST}
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={tw.style('pb-4')}
      showsVerticalScrollIndicator={false}
    />
  );
};

// ---------------------------------------------------------------------------
// Props tab — winner module + "Props" header + infinite props feed
// ---------------------------------------------------------------------------

interface PropsTabContentProps {
  config: ReturnType<typeof selectPredictWorldCupConfig>;
  entryPoint?: PredictEntryPoint;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PropsTabContent: React.FC<PropsTabContentProps> = ({
  config,
  entryPoint,
  transactionActiveAbTests,
}) => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { market: winnerMarket, refetch: refetchWinner } =
    usePredictWorldCupWinnerMarket(config);

  const {
    marketData,
    isFetching,
    isFetchingMore,
    error,
    hasMore,
    refetch,
    fetchMore,
  } = usePredictWorldCupMarkets({
    tabKey: PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS,
    config,
  });

  // The winner market is rendered in the dedicated header module, so exclude it
  // from the props feed list to avoid rendering it twice.
  const filteredMarketData = useMemo(
    () =>
      winnerMarket
        ? marketData.filter((market) => market.id !== winnerMarket.id)
        : marketData,
    [marketData, winnerMarket],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchWinner()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchWinner]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      fetchMore();
    }
  }, [fetchMore, hasMore, isFetchingMore]);

  const renderItem = useCallback(
    ({ item, index }: { item: PredictMarketType; index: number }) => (
      <Box twClassName="px-4">
        <PredictMarket
          market={item}
          entryPoint={entryPoint}
          testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.MARKET_CARD}-props-${index}`}
          predictFeedTab={PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}
          predictScreen={PredictEventValues.PREDICT_SCREEN.WORLD_CUP}
          transactionActiveAbTests={transactionActiveAbTests}
        />
      </Box>
    ),
    [entryPoint, transactionActiveAbTests],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) return null;
    return (
      <Box twClassName="px-4 py-2">
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-props-footer`}
        />
      </Box>
    );
  }, [isFetchingMore]);

  const winnerModuleNode = useMemo(
    () =>
      winnerMarket ? (
        <PredictWorldCupWinnerModule
          market={winnerMarket}
          entryPoint={entryPoint}
          predictScreen={PredictEventValues.PREDICT_SCREEN.WORLD_CUP}
          transactionActiveAbTests={transactionActiveAbTests}
        />
      ) : null,
    [winnerMarket, entryPoint, transactionActiveAbTests],
  );

  const ListHeaderComponent = useMemo(
    () => (
      <>
        {winnerModuleNode}
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          style={tw.style('font-medium px-4 pt-4 pb-2')}
        >
          {strings('predict.world_cup.tabs.props')}
        </Text>
      </>
    ),
    [winnerModuleNode, tw],
  );

  if (isFetching && !isRefreshing && !isFetchingMore) {
    return (
      <Box twClassName="flex-1">
        {winnerModuleNode}
        <Box twClassName="px-4">
          <PredictMarketSkeleton
            testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-props-1`}
          />
          <PredictMarketSkeleton
            testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-props-2`}
          />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        twClassName="flex-1"
        testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.ERROR_STATE}
      >
        {winnerModuleNode}
        <PredictOffline onRetry={handleRefresh} />
      </Box>
    );
  }

  return (
    <FlashList
      testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.PROPS_LIST}
      data={filteredMarketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={tw.style('pb-4')}
      showsVerticalScrollIndicator={false}
    />
  );
};

// ---------------------------------------------------------------------------
// Main hub screen
// ---------------------------------------------------------------------------

const PredictWorldCupHub: React.FC = () => {
  const tw = useTailwind();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictWorldCup'>>();
  const config = useSelector(selectPredictWorldCupConfig);

  const entryPoint = (route.params?.entryPoint ??
    PredictEventValues.ENTRY_POINT.PREDICT_FEED) as PredictEntryPoint;
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;

  const initialTab = useMemo(
    () => resolvePredictWorldCupHubInitialTab(route.params?.initialTab),
    [route.params?.initialTab],
  );

  const {
    activeTab,
    tabsScrollViewRef,
    feedSessionId,
    feedSessionStartTime,
    getPageViewCount,
    handleTabLayout,
    handleTabPress,
    handleBack,
  } = usePredictWorldCupFeedSession<PredictWorldCupHubTabKey>({
    initialTab,
    entryPoint,
    routeEntryPoint: route.params?.entryPoint as PredictEntryPoint | undefined,
    transactionActiveAbTests,
  });

  const hasTrackedInitialFeedViewed = useRef(false);

  // Single hook call — sections, live status and refetch are passed down to GamesTabContent.
  // No `enabled` guard needed: PredictWorldCupRoute already ensures this component only
  // mounts when `enabled && showWorldCupScreen && showHubV2` are all true.
  const {
    sections: gamesSections,
    isLive,
    isFetching: isGamesFetching,
    error: gamesError,
    refetch: refetchGames,
  } = usePredictWorldCupGamesSections(config);
  const tabs = useMemo(() => buildPredictWorldCupHubTabs(isLive), [isLive]);

  useEffect(() => {
    if (hasTrackedInitialFeedViewed.current) return;

    Engine.context.PredictController.trackFeedViewed({
      sessionId: feedSessionId,
      feedTab: initialTab,
      predictScreen: PredictEventValues.PREDICT_SCREEN.WORLD_CUP,
      numPagesViewed: getPageViewCount(),
      sessionTime: Math.round((Date.now() - feedSessionStartTime) / 1000),
      entryPoint,
      isSessionEnd: false,
    });
    hasTrackedInitialFeedViewed.current = true;
  }, [
    entryPoint,
    feedSessionId,
    feedSessionStartTime,
    getPageViewCount,
    initialTab,
  ]);

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.CONTAINER}
    >
      <HeaderStandard
        title={strings('predict.world_cup.title')}
        onBack={handleBack}
        includesTopInset
      />

      <PredictWorldCupHubBanner />

      <Box twClassName="flex-1">
        <ScrollView
          ref={tabsScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw.style('grow-0')}
          contentContainerStyle={tw.style('gap-2 px-4 pb-4')}
          testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.TABS}
        >
          {tabs.map((tab) => (
            <HubTabButton
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onPress={() => handleTabPress(tab.key)}
              onLayout={(event) => handleTabLayout(tab.key, event)}
            />
          ))}
        </ScrollView>

        {activeTab === PREDICT_WORLD_CUP_HUB_TAB_KEYS.GAMES ? (
          <GamesTabContent
            sections={gamesSections}
            isFetching={isGamesFetching}
            error={gamesError}
            refetch={refetchGames}
            entryPoint={entryPoint}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ) : (
          <PropsTabContent
            config={config}
            entryPoint={entryPoint}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        )}
      </Box>
    </SafeAreaView>
  );
};

export default PredictWorldCupHub;
