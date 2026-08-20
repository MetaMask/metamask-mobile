import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { useFeed } from '../../hooks/useFeed';
import {
  FEED_SCREENS,
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
  getFeedScreenTab,
  type FeedScreenId,
} from '../../navigation/feedScreens';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { KALSHI_VENUE_ID, type PredictEvent } from '../../types';
import Engine from '../../../../../core/Engine';
import { TraceName } from '../../../../../util/trace';
import { FeedPreviewSection } from './internal/FeedPreviewSection';
import { PredictHomeTestIds } from './PredictHome.testIds';

const PREVIEW_LIMIT = 2;
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
  const nflQuery = useFeed(KALSHI_VENUE_ID, NFL_GAMES_FEED_ID, {
    limit: PREVIEW_LIMIT,
  });
  const ncaaQuery = useFeed(KALSHI_VENUE_ID, NCAA_GAMES_FEED_ID, {
    limit: PREVIEW_LIMIT,
  });
  const nflEvents =
    nflQuery.data?.pages[0]?.events.slice(0, PREVIEW_LIMIT) ?? [];
  const ncaaEvents =
    ncaaQuery.data?.pages[0]?.events.slice(0, PREVIEW_LIMIT) ?? [];

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

  const openFeedScreen = useCallback(
    (feedScreenId: FeedScreenId) =>
      navigation.navigate(PredictNextRoutes.FEED, {
        venueId: KALSHI_VENUE_ID,
        feedScreenId,
      }),
    [navigation],
  );
  const openEvent = useCallback(
    (event: PredictEvent) =>
      navigation.navigate(PredictNextRoutes.EVENT_DETAIL, {
        venueId: event.venueId,
        eventId: event.id,
        title: event.title,
      }),
    [navigation],
  );

  return (
    <Box twClassName="flex-1 pt-12" testID={PredictHomeTestIds.HOME}>
      <ScrollView testID={PredictHomeTestIds.SCROLL}>
        <Box twClassName="gap-6 px-4 pb-8">
          <Text variant={TextVariant.HeadingLg}>Predictions</Text>
          <FeedPreviewSection
            feedScreenId={NFL_FEED_SCREEN_ID}
            title={FEED_SCREENS[NFL_FEED_SCREEN_ID].selectionLabel}
            events={nflEvents}
            isLoading={nflQuery.isLoading}
            isError={nflQuery.isError}
            onOpen={() => openFeedScreen(NFL_FEED_SCREEN_ID)}
            onOpenEvent={openEvent}
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
            onRetry={() => ncaaQuery.refetch()}
          />
        </Box>
      </ScrollView>
    </Box>
  );
};
