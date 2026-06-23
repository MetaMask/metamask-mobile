import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTailwind ,
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
import { v4 as uuidv4 } from 'uuid';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  selectPredictWorldCupConfig,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../selectors/featureFlags';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PredictMarket as PredictMarketType } from '../../types';
import {
  PREDICT_WORLD_CUP_HUB_DEFAULT_TAB,
  PREDICT_WORLD_CUP_HUB_TAB_KEYS,
  buildPredictWorldCupHubTabs,
  type PredictWorldCupHubTab,
  type PredictWorldCupHubTabKey,
} from '../../constants/worldCupHubTabs';
import {
  usePredictWorldCupGamesSections,
  usePredictWorldCupWinnerMarket,
  type PredictWorldCupStageSection,
} from '../../hooks/usePredictWorldCupHub';
import { usePredictWorldCupMarkets } from '../../hooks';
import PredictMarket from '../../components/PredictMarket';
import PredictMarketSkeleton from '../../components/PredictMarketSkeleton';
import PredictOffline from '../../components/PredictOffline';
import PulsingLiveDot from '../../components/PulsingLiveDot/PulsingLiveDot';
import PredictWorldCupWinnerModule from '../../components/PredictWorldCupWinnerModule';
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
  refetch: () => Promise<void>;
  entryPoint?: PredictEntryPoint;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const GamesTabContent: React.FC<GamesTabContentProps> = ({
  sections,
  isFetching,
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

  if (isFetching && !isRefreshing) {
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
      estimatedItemSize={120}
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
  onWinnerTileBuyPress?: () => void;
}

const PropsTabContent: React.FC<PropsTabContentProps> = ({
  config,
  entryPoint,
  transactionActiveAbTests,
  onWinnerTileBuyPress,
}) => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { market: winnerMarket } = usePredictWorldCupWinnerMarket(config);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      fetchMore();
    }
  }, [fetchMore, hasMore, isFetchingMore]);

  const renderItem = useCallback(
    ({ item, index }: { item: PredictMarketType; index: number }) => (
      <PredictMarket
        market={item}
        entryPoint={entryPoint}
        testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.MARKET_CARD}-props-${index}`}
        predictFeedTab={PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS}
        predictScreen={PredictEventValues.PREDICT_SCREEN.WORLD_CUP}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    ),
    [entryPoint, transactionActiveAbTests],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) return null;
    return (
      <Box twClassName="py-2">
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_HUB_TEST_IDS.SKELETON}-props-footer`}
        />
      </Box>
    );
  }, [isFetchingMore]);

  const ListHeaderComponent = useMemo(
    () => (
      <>
        {winnerMarket && (
          <PredictWorldCupWinnerModule
            market={winnerMarket}
            entryPoint={entryPoint}
            predictScreen={PredictEventValues.PREDICT_SCREEN.WORLD_CUP}
            transactionActiveAbTests={transactionActiveAbTests}
            onTileBuyPress={onWinnerTileBuyPress}
          />
        )}
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          style={tw.style('font-medium px-4 pt-4 pb-2')}
        >
          {strings('predict.world_cup.tabs.props')}
        </Text>
      </>
    ),
    [
      winnerMarket,
      entryPoint,
      transactionActiveAbTests,
      onWinnerTileBuyPress,
      tw,
    ],
  );

  if (isFetching && !isRefreshing && !isFetchingMore) {
    return (
      <Box twClassName="flex-1">
        {winnerMarket && (
          <PredictWorldCupWinnerModule
            market={winnerMarket}
            entryPoint={entryPoint}
            predictScreen={PredictEventValues.PREDICT_SCREEN.WORLD_CUP}
            transactionActiveAbTests={transactionActiveAbTests}
            onTileBuyPress={onWinnerTileBuyPress}
          />
        )}
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
        <PredictOffline onRetry={handleRefresh} />
      </Box>
    );
  }

  return (
    <FlashList
      testID={PREDICT_WORLD_CUP_HUB_TEST_IDS.PROPS_LIST}
      data={marketData}
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
      estimatedItemSize={150}
    />
  );
};

// ---------------------------------------------------------------------------
// Main hub screen
// ---------------------------------------------------------------------------

const PredictWorldCupHub: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const tabsScrollViewRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const hasScrolledToInitialTabRef = useRef(false);
  const hasTrackedInitialFeedViewed = useRef(false);
  const feedSessionId = useMemo(() => uuidv4(), []);
  const feedSessionStartTime = useMemo(() => Date.now(), []);
  const feedPageViewCount = useRef(0);

  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictWorldCup'>>();
  const config = useSelector(selectPredictWorldCupConfig);
  const isScreenEnabled = useSelector(selectPredictWorldCupScreenEnabledFlag);

  const entryPoint = (route.params?.entryPoint ??
    PredictEventValues.ENTRY_POINT.PREDICT_FEED) as PredictEntryPoint;
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;

  // Single hook call — sections, live status and refetch are passed down to GamesTabContent.
  const {
    sections: gamesSections,
    isLive,
    isFetching: isGamesFetching,
    refetch: refetchGames,
  } = usePredictWorldCupGamesSections(config);
  const tabs = useMemo(() => buildPredictWorldCupHubTabs(isLive), [isLive]);

  const [activeTab, setActiveTab] = useState<PredictWorldCupHubTabKey>(
    PREDICT_WORLD_CUP_HUB_DEFAULT_TAB,
  );

  useEffect(() => {
    if (isScreenEnabled) return;
    navigation.navigate(Routes.PREDICT.MARKET_LIST as never, {
      entryPoint: route.params?.entryPoint,
      ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
    });
  }, [
    isScreenEnabled,
    navigation,
    route.params?.entryPoint,
    transactionActiveAbTests,
  ]);

  useEffect(() => {
    if (!isScreenEnabled || hasTrackedInitialFeedViewed.current) return;

    Engine.context.PredictController.trackFeedViewed({
      sessionId: feedSessionId,
      feedTab: PREDICT_WORLD_CUP_HUB_DEFAULT_TAB,
      predictScreen: PredictEventValues.PREDICT_SCREEN.WORLD_CUP,
      numPagesViewed: feedPageViewCount.current,
      sessionTime: Math.round((Date.now() - feedSessionStartTime) / 1000),
      entryPoint,
      isSessionEnd: false,
    });
    hasTrackedInitialFeedViewed.current = true;
  }, [entryPoint, feedSessionId, feedSessionStartTime, isScreenEnabled]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.PREDICT.MARKET_LIST as never, {
      entryPoint: route.params?.entryPoint,
      ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
    });
  }, [navigation, route.params?.entryPoint, transactionActiveAbTests]);

  const scrollActiveTabIntoView = useCallback(
    (tabKey: PredictWorldCupHubTabKey, animated: boolean) => {
      const layout = tabLayoutsRef.current[tabKey];
      if (!layout || !tabsScrollViewRef.current) return;
      const targetX = Math.max(layout.x - 16, 0);
      tabsScrollViewRef.current.scrollTo({ x: targetX, animated });
    },
    [],
  );

  const handleTabLayout = useCallback(
    (tabKey: PredictWorldCupHubTabKey, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayoutsRef.current[tabKey] = { x, width };
      if (!hasScrolledToInitialTabRef.current && tabKey === activeTab) {
        hasScrolledToInitialTabRef.current = true;
        scrollActiveTabIntoView(tabKey, false);
      }
    },
    [activeTab, scrollActiveTabIntoView],
  );

  const handleTabPress = useCallback(
    (tabKey: PredictWorldCupHubTabKey) => {
      if (tabKey === activeTab) return;
      feedPageViewCount.current += 1;
      Engine.context.PredictController.trackFeedViewed({
        sessionId: feedSessionId,
        feedTab: tabKey,
        predictScreen: PredictEventValues.PREDICT_SCREEN.WORLD_CUP,
        numPagesViewed: feedPageViewCount.current,
        sessionTime: Math.round((Date.now() - feedSessionStartTime) / 1000),
        entryPoint,
        isSessionEnd: false,
      });
      setActiveTab(tabKey);
    },
    [activeTab, entryPoint, feedSessionId, feedSessionStartTime],
  );

  useEffect(() => {
    scrollActiveTabIntoView(activeTab, true);
  }, [activeTab, scrollActiveTabIntoView]);

  const handleWinnerTileBuyPress = useCallback(() => {
    Engine.context.PredictController.trackFeedViewed({
      sessionId: feedSessionId,
      feedTab: PREDICT_WORLD_CUP_HUB_TAB_KEYS.PROPS,
      predictScreen: PredictEventValues.PREDICT_SCREEN.WORLD_CUP,
      numPagesViewed: feedPageViewCount.current,
      sessionTime: Math.round((Date.now() - feedSessionStartTime) / 1000),
      entryPoint,
      isSessionEnd: false,
    });
  }, [entryPoint, feedSessionId, feedSessionStartTime]);

  if (!isScreenEnabled) return null;

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
            refetch={refetchGames}
            entryPoint={entryPoint}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ) : (
          <PropsTabContent
            config={config}
            entryPoint={entryPoint}
            transactionActiveAbTests={transactionActiveAbTests}
            onWinnerTileBuyPress={handleWinnerTileBuyPress}
          />
        )}
      </Box>
    </SafeAreaView>
  );
};

export default PredictWorldCupHub;
