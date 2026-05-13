import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectPredictWorldCupConfig,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../selectors/featureFlags';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import type { PredictMarket as PredictMarketType } from '../../types';
import {
  resolvePredictWorldCupInitialTab,
  type PredictWorldCupTabKey,
} from '../../constants/worldCupTabs';
import {
  usePredictWorldCupAvailableTabs,
  usePredictWorldCupMarkets,
} from '../../hooks';
import PredictMarket from '../../components/PredictMarket';
import PredictMarketSkeleton from '../../components/PredictMarketSkeleton';
import PredictOffline from '../../components/PredictOffline';
import type { PredictWorldCupConfig } from '../../types/flags';
import { strings } from '../../../../../../locales/i18n';

export const PREDICT_WORLD_CUP_SCREEN_TEST_IDS = {
  CONTAINER: 'predict-world-cup-screen',
  INITIAL_TAB: 'predict-world-cup-initial-tab',
  TABS: 'predict-world-cup-tabs',
  TAB: 'predict-world-cup-tab',
  EMPTY_STATE: 'predict-world-cup-empty-state',
  ERROR_STATE: 'predict-world-cup-error-state',
  MARKET_LIST: 'predict-world-cup-market-list',
  MARKET_CARD: 'predict-world-cup-market-card',
  SKELETON: 'predict-world-cup-skeleton',
} as const;

type Tw = ReturnType<typeof useTailwind>;

type WorldCupConfigSubset = Pick<
  PredictWorldCupConfig,
  'seriesId' | 'tagSlug' | 'gamesTagId' | 'stages'
>;

const LiveIndicator = ({ tw, size = 8 }: { tw: Tw; size?: number }) => (
  <View
    style={[
      tw.style('bg-success-default'),
      {
        width: size,
        height: size,
        borderRadius: size / 2,
      },
    ]}
  />
);

interface WorldCupTabContentProps {
  activeTab: PredictWorldCupTabKey;
  config: WorldCupConfigSubset;
  entryPoint?: PredictEntryPoint;
}

const WorldCupTabContent = ({
  activeTab,
  config,
  entryPoint,
}: WorldCupTabContentProps) => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    marketData,
    isFetching,
    isFetchingMore,
    error,
    hasMore,
    refetch,
    fetchMore,
  } = usePredictWorldCupMarkets({
    tabKey: activeTab,
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
      <Box twClassName="mb-3">
        <PredictMarket
          market={item}
          entryPoint={entryPoint}
          testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.MARKET_CARD}-${
            index + 1
          }`}
        />
      </Box>
    ),
    [entryPoint],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) {
      return null;
    }

    return (
      <Box twClassName="py-2">
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.SKELETON}-footer-1`}
        />
      </Box>
    );
  }, [isFetchingMore]);

  if (isFetching && !isRefreshing && !isFetchingMore) {
    return (
      <Box twClassName="flex-1 px-4">
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.SKELETON}-1`}
        />
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.SKELETON}-2`}
        />
        <PredictMarketSkeleton
          testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.SKELETON}-3`}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        twClassName="flex-1"
        testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.ERROR_STATE}
      >
        <PredictOffline onRetry={handleRefresh} />
      </Box>
    );
  }

  if (marketData.length === 0) {
    return (
      <Box
        twClassName="flex-1 justify-center items-center p-8"
        testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.EMPTY_STATE}
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
      testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.MARKET_LIST}
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      contentContainerStyle={tw.style('px-4 pb-4')}
      showsVerticalScrollIndicator={false}
    />
  );
};

const PredictWorldCup: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictWorldCup'>>();
  const config = useSelector(selectPredictWorldCupConfig);
  const isScreenEnabled = useSelector(selectPredictWorldCupScreenEnabledFlag);

  const { tabs, availability } = usePredictWorldCupAvailableTabs(config, {
    enabled: isScreenEnabled,
  });

  const initialTab = useMemo(
    () =>
      resolvePredictWorldCupInitialTab(
        route.params?.initialTab,
        config,
        availability,
      ),
    [availability, config, route.params?.initialTab],
  );

  const [activeTab, setActiveTab] = useState<PredictWorldCupTabKey>(initialTab);
  const entryPoint = route.params?.entryPoint as PredictEntryPoint | undefined;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isScreenEnabled) {
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: route.params?.entryPoint,
    });
  }, [isScreenEnabled, navigation, route.params?.entryPoint]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: route.params?.entryPoint,
    });
  }, [navigation, route.params?.entryPoint]);

  if (!isScreenEnabled) {
    return null;
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.CONTAINER}
    >
      <HeaderStandard
        title={strings('predict.world_cup.title')}
        onBack={handleBack}
        includesTopInset
      />

      <Box twClassName="flex-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw.style('grow-0')}
          contentContainerStyle={tw.style('gap-2 px-4 pb-4')}
          testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TABS}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={tw.style(
                  'min-w-[51px] flex-row items-center justify-center gap-2 rounded-xl bg-muted p-2',
                  isActive && 'bg-icon-default',
                )}
                testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-${tab.key}`}
              >
                {tab.isLive && <LiveIndicator tw={tw} />}
                <Text
                  color={
                    isActive
                      ? TextColor.PrimaryInverse
                      : TextColor.TextAlternative
                  }
                  variant={TextVariant.BodySm}
                  style={tw.style(
                    'font-medium leading-[22px]',
                    tab.isLive && !isActive && 'text-success-default',
                  )}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text
          testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB}
          style={tw.style('h-0 opacity-0')}
        >
          {activeTab}
        </Text>

        <WorldCupTabContent
          activeTab={activeTab}
          config={config}
          entryPoint={entryPoint}
        />
      </Box>
    </SafeAreaView>
  );
};

export default PredictWorldCup;
