import React, { useCallback, useMemo } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  HeaderStandardAnimated,
  IconName,
  Text,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import Reanimated from 'react-native-reanimated';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { useFeed } from '../../hooks/useFeed';
import { useEventsWithLiveData } from '../../hooks/useEventsWithLiveData';
import { useBalance } from '../../hooks/useBalance';
import {
  FEED_SCREENS,
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
  getFeedScreenTab,
  type FeedScreenId,
} from '../../navigation/feedScreens';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { usePredictOrderFlow } from '../PredictOrderFlow';
import {
  KALSHI_VENUE_ID,
  type PredictEvent,
  type PredictMarket,
  type PredictOutcome,
} from '../../types';
import Engine from '../../../../../core/Engine';
import { TraceName } from '../../../../../util/trace';
import { BalanceSummary } from './internal/BalanceSummary';
import { FeedPreviewSection } from './internal/FeedPreviewSection';
import { PortfolioActions } from './internal/PortfolioActions';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { strings } from '../../../../../../locales/i18n';

const PREVIEW_LIMIT = 2;
const NO_EVENTS: readonly PredictEvent[] = [];
const NFL_GAMES_FEED_ID = getFeedScreenTab(
  FEED_SCREENS[NFL_FEED_SCREEN_ID],
).feedId;
const NCAA_GAMES_FEED_ID = getFeedScreenTab(
  FEED_SCREENS[NCAA_FEED_SCREEN_ID],
).feedId;

export const PredictHome = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const route =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextHome'>>();
  const entryPoint = route.params?.entryPoint;
  const balanceQuery = useBalance(KALSHI_VENUE_ID);
  const nflQuery = useFeed(KALSHI_VENUE_ID, NFL_GAMES_FEED_ID, {
    limit: PREVIEW_LIMIT,
  });
  const ncaaQuery = useFeed(KALSHI_VENUE_ID, NCAA_GAMES_FEED_ID, {
    limit: PREVIEW_LIMIT,
  });
  const feedNflEvents = useMemo(
    () => nflQuery.data?.pages[0]?.events.slice(0, PREVIEW_LIMIT) ?? NO_EVENTS,
    [nflQuery.data],
  );
  const feedNcaaEvents = useMemo(
    () => ncaaQuery.data?.pages[0]?.events.slice(0, PREVIEW_LIMIT) ?? NO_EVENTS,
    [ncaaQuery.data],
  );
  const feedEvents = useMemo(
    () => [...feedNflEvents, ...feedNcaaEvents],
    [feedNflEvents, feedNcaaEvents],
  );
  const liveEvents = useEventsWithLiveData(KALSHI_VENUE_ID, feedEvents, {
    marketScope: 'card',
  });
  const nflEvents = useMemo(
    () => liveEvents.slice(0, feedNflEvents.length),
    [liveEvents, feedNflEvents.length],
  );
  const ncaaEvents = useMemo(
    () => liveEvents.slice(feedNflEvents.length),
    [liveEvents, feedNflEvents.length],
  );

  usePredictNextMeasurement({
    traceName: TraceName.PredictNextHomeView,
    conditions: [!nflQuery.isLoading, !ncaaQuery.isLoading],
    debugContext: {
      nflEventCount: nflEvents.length,
      nflError: nflQuery.isError,
      ncaaEventCount: ncaaEvents.length,
      ncaaError: ncaaQuery.isError,
    },
  });

  useFocusEffect(
    useCallback(() => {
      Engine.context.PredictController.trackHomeViewed({ entryPoint });

      return () => {
        if (entryPoint) {
          navigation.setParams({ entryPoint: undefined });
        }
      };
    }, [entryPoint, navigation]),
  );

  const homeTitle = strings('predict_next.home_title');
  const { scrollY, titleSectionHeightSv, setTitleSectionHeight, onScroll } =
    useHeaderStandardAnimated();

  const handleTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setTitleSectionHeight(event.nativeEvent.layout.height);
    },
    [setTitleSectionHeight],
  );

  const openPortfolio = useCallback(
    () =>
      navigation.navigate(PredictNextRoutes.PORTFOLIO, {
        venueId: KALSHI_VENUE_ID,
      }),
    [navigation],
  );
  const openSearch = useCallback(
    () =>
      navigation.navigate(PredictNextRoutes.SEARCH, {
        venueId: KALSHI_VENUE_ID,
      }),
    [navigation],
  );
  const openFeedScreen = useCallback(
    (feedScreenId: FeedScreenId) =>
      navigation.navigate(PredictNextRoutes.FEED, {
        venueId: KALSHI_VENUE_ID,
        feedScreenId,
      }),
    [navigation],
  );
  const { openOrderFlow } = usePredictOrderFlow();
  const openEvent = useCallback(
    (event: PredictEvent) =>
      navigation.navigate(PredictNextRoutes.EVENT, {
        venueId: event.venueId,
        eventId: event.id,
        titleSnapshot: event.title,
      }),
    [navigation],
  );
  const openOrder = useCallback(
    (event: PredictEvent, market: PredictMarket, outcome: PredictOutcome) => {
      openOrderFlow({
        venueId: event.venueId,
        marketId: market.id,
        side: outcome.side,
        outcomeLabel: outcome.label,
        eventTitle: event.title,
        eventImageUrl: event.imageUrl,
        askPrice: outcome.askPrice,
      });
    },
    [openOrderFlow],
  );

  return (
    <Box twClassName="flex-1 bg-default" testID={PredictHomeTestIds.HOME}>
      <HeaderStandardAnimated
        includesTopInset
        title={homeTitle}
        titleProps={{ testID: PredictHomeTestIds.HEADER_TITLE }}
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        endButtonIconProps={[
          {
            iconName: IconName.Search,
            onPress: openSearch,
            testID: PredictHomeTestIds.SEARCH,
            accessibilityLabel: strings('predict_next.search.placeholder'),
            accessibilityRole: 'button',
          },
        ]}
        {...(navigation.canGoBack()
          ? {
              onBack: () => navigation.goBack(),
              backButtonProps: { testID: PredictHomeTestIds.BACK },
            }
          : {})}
      />
      <Reanimated.ScrollView
        testID={PredictHomeTestIds.SCROLL}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Box twClassName="gap-6 px-4 pb-8">
          <Text
            variant={TextVariant.HeadingLg}
            testID={PredictHomeTestIds.TITLE_SECTION}
            onLayout={handleTitleLayout}
          >
            {homeTitle}
          </Text>
          <BalanceSummary
            balance={balanceQuery.data}
            isLoading={balanceQuery.isPending}
            isError={balanceQuery.isError}
            onRetry={() => balanceQuery.refetch()}
          />
          <PortfolioActions
            onPositionsPress={openPortfolio}
            // TODO(PRED-1162): Wire funding actions when the funding slice lands.
            onAddFundsPress={() => undefined}
            onWithdrawPress={() => undefined}
          />
          <FeedPreviewSection
            feedScreenId={NFL_FEED_SCREEN_ID}
            title={FEED_SCREENS[NFL_FEED_SCREEN_ID].selectionLabel}
            events={nflEvents}
            isLoading={nflQuery.isLoading}
            isError={nflQuery.isError}
            onOpen={() => openFeedScreen(NFL_FEED_SCREEN_ID)}
            onOpenEvent={openEvent}
            onOrder={openOrder}
            onRetry={() => nflQuery.refetch()}
          />
          <FeedPreviewSection
            feedScreenId={NCAA_FEED_SCREEN_ID}
            title={FEED_SCREENS[NCAA_FEED_SCREEN_ID].selectionLabel}
            events={ncaaEvents}
            isLoading={ncaaQuery.isLoading}
            isError={ncaaQuery.isError}
            onOpen={() => openFeedScreen(NCAA_FEED_SCREEN_ID)}
            onOpenEvent={openEvent}
            onOrder={openOrder}
            onRetry={() => ncaaQuery.refetch()}
          />
        </Box>
      </Reanimated.ScrollView>
    </Box>
  );
};
