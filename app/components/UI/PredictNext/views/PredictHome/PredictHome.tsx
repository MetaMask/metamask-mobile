import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useFeed } from '../../hooks/useFeed';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { useVenueStatus } from '../../hooks/useVenueStatus';
import {
  KALSHI_VENUE_ID,
  type PredictEvent,
  type PredictFeedId,
} from '../../types';
import { EventCardGame, EventCardStandard } from '../../events/cards';
import type { PredictNextStackParamList } from '../../navigation/types';
import { PredictNextRoutes } from '../../navigation/routes';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Engine from '../../../../../core/Engine';
import { TraceName } from '../../../../../util/trace';
import { PredictHomeTestIds } from './PredictHome.testIds';
import {
  projectHomeFeedViewState,
  shouldFetchHomeVenueStatus,
  type HomeFeedBlockingState,
} from './projectHomeFeedViewState';

const PAGE_SIZE = 20;
const NFL_GAMES_FEED_ID = 'sports-football-nfl-games' as PredictFeedId;

const EventSeparator = () => <Box twClassName="h-3" />;

const HomeFeedBlocking = ({
  blocking,
  onRetry,
}: {
  blocking: HomeFeedBlockingState;
  onRetry: () => void;
}) => {
  if (blocking.kind === 'none') {
    return null;
  }

  if (blocking.kind === 'loading') {
    return (
      <Box testID={PredictHomeTestIds.LOADING} twClassName="gap-4 p-4">
        <Box twClassName="h-32 rounded-xl bg-muted" />
        <Box twClassName="h-32 rounded-xl bg-muted" />
      </Box>
    );
  }

  return (
    <Box
      testID={
        blocking.kind === 'action_failed'
          ? PredictHomeTestIds.ERROR
          : PredictHomeTestIds.EMPTY
      }
      twClassName="items-center gap-4 p-8"
    >
      <Text>{blocking.message}</Text>
      {blocking.showRetry ? <Button onPress={onRetry}>Retry</Button> : null}
    </Box>
  );
};

const isAmericanFootballGameEvent = (event: PredictEvent): boolean =>
  event.sports?.sport.id === 'american-football' && Boolean(event.sports.game);

const getEventItemType = (event: PredictEvent): 'game' | 'standard' =>
  isAmericanFootballGameEvent(event) ? 'game' : 'standard';

interface EventFeedItemProps {
  event: PredictEvent;
  onOpenEvent: (event: PredictEvent) => void;
}

const EventFeedItem = React.memo(
  ({ event, onOpenEvent }: EventFeedItemProps) => {
    const handlePress = useCallback(
      () => onOpenEvent(event),
      [event, onOpenEvent],
    );

    return isAmericanFootballGameEvent(event) ? (
      <EventCardGame event={event} onPress={handlePress} />
    ) : (
      <EventCardStandard event={event} onPress={handlePress} />
    );
  },
);
EventFeedItem.displayName = 'EventFeedItem';

export const PredictHome = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const route =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextHome'>>();
  const entryPoint = route.params?.entryPoint;
  const eventsQuery = useFeed(KALSHI_VENUE_ID, NFL_GAMES_FEED_ID, {
    limit: PAGE_SIZE,
  });
  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.events) ?? [],
    [eventsQuery.data],
  );
  const needsVenueStatus = shouldFetchHomeVenueStatus({
    isFeedLoading: eventsQuery.isLoading,
    isFeedError: eventsQuery.isError,
    eventCount: events.length,
  });
  const statusQuery = useVenueStatus(KALSHI_VENUE_ID, {
    enabled: needsVenueStatus,
  });
  const endReached = useRef(false);
  const [paginationError, setPaginationError] = useState(false);
  const viewState = useMemo(
    () =>
      projectHomeFeedViewState({
        events,
        isFeedLoading: eventsQuery.isLoading,
        isFeedError: eventsQuery.isError,
        feedError: eventsQuery.error,
        isFetchingNextPage: eventsQuery.isFetchingNextPage,
        paginationError,
        venueStatus: statusQuery.data?.status,
        isVenueStatusLoading: statusQuery.isLoading,
        isVenueStatusError: statusQuery.isError,
        venueStatusError: statusQuery.error,
      }),
    [
      events,
      eventsQuery.error,
      eventsQuery.isError,
      eventsQuery.isFetchingNextPage,
      eventsQuery.isLoading,
      paginationError,
      statusQuery.data?.status,
      statusQuery.error,
      statusQuery.isError,
      statusQuery.isLoading,
    ],
  );

  usePredictNextMeasurement({
    traceName: TraceName.PredictNextHomeView,
    conditions: [viewState.isMeasurementComplete],
    debugContext: {
      eventCount: viewState.events.length,
      eventsError: eventsQuery.isError,
      venueStatus: statusQuery.data?.status ?? 'unknown',
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

  const tw = useTailwind();

  const openEvent = useCallback(
    (event: PredictEvent) =>
      navigation.navigate(PredictNextRoutes.EVENT_DETAIL, {
        venueId: event.venueId,
        eventId: event.id,
        title: event.title,
      }),
    [navigation],
  );
  const renderEvent = useCallback(
    ({ item }: ListRenderItemInfo<PredictEvent>) => (
      <EventFeedItem event={item} onOpenEvent={openEvent} />
    ),
    [openEvent],
  );
  const retryAll = () => {
    eventsQuery.refetch();
    if (needsVenueStatus) {
      statusQuery.refetch();
    }
  };
  const loadNextPage = () => {
    if (
      !endReached.current &&
      eventsQuery.hasNextPage &&
      !eventsQuery.isFetchingNextPage
    ) {
      endReached.current = true;
      eventsQuery
        .fetchNextPage()
        .then((result) => setPaginationError(result.isError))
        .catch(() => setPaginationError(true))
        .finally(() => {
          endReached.current = false;
        });
    }
  };

  return (
    <Box twClassName="flex-1 pt-12" testID={PredictHomeTestIds.HOME}>
      <Box twClassName="px-4 pb-2">
        <Text variant={TextVariant.HeadingLg}>Predictions</Text>
      </Box>
      {viewState.blocking.kind === 'none' ? (
        <FlashList
          testID={PredictHomeTestIds.FEED}
          data={viewState.events}
          renderItem={renderEvent}
          getItemType={getEventItemType}
          keyExtractor={(event) => `${event.venueId}:${event.id}`}
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.5}
          ItemSeparatorComponent={EventSeparator}
          contentContainerStyle={tw.style('px-4')}
          ListFooterComponent={
            viewState.footer === 'loading' ? (
              <Text testID={PredictHomeTestIds.FOOTER_LOADING}>Loading…</Text>
            ) : viewState.footer === 'retry' ? (
              <Button
                testID={PredictHomeTestIds.FOOTER_RETRY}
                variant={ButtonVariant.Tertiary}
                onPress={loadNextPage}
              >
                Retry
              </Button>
            ) : null
          }
        />
      ) : (
        <HomeFeedBlocking blocking={viewState.blocking} onRetry={retryAll} />
      )}
    </Box>
  );
};
