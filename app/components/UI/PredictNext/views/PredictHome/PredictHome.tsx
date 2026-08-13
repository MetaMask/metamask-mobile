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
import { useEventList } from '../../hooks/useEventList';
import { useVenueStatus } from '../../hooks/useVenueStatus';
import { KALSHI_VENUE_ID, type PredictEvent } from '../../types';
import { EventCardStandard } from '../../components/EventCard/EventCardStandard';
import type { PredictNextStackParamList } from '../../navigation/types';
import { PredictNextRoutes } from '../../navigation/routes';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Engine from '../../../../../core/Engine';

const PAGE_SIZE = 20;

const EventSeparator = () => <Box twClassName="h-3" />;

export const PredictHome = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const route =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextHome'>>();
  const entryPoint = route.params?.entryPoint;
  const statusQuery = useVenueStatus(KALSHI_VENUE_ID);
  const eventsQuery = useEventList(KALSHI_VENUE_ID, { limit: PAGE_SIZE });
  const endReached = useRef(false);
  const [paginationError, setPaginationError] = useState(false);

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

  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [eventsQuery.data],
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
      <EventCardStandard event={item} onPress={() => openEvent(item)} />
    ),
    [openEvent],
  );
  const retryAll = () => {
    statusQuery.refetch();
    eventsQuery.refetch();
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

  let blockingContent: React.ReactNode;
  if (eventsQuery.isLoading) {
    blockingContent = (
      <Box testID="predict-next-loading" twClassName="gap-4 p-4">
        <Box twClassName="h-32 rounded-xl bg-muted" />
        <Box twClassName="h-32 rounded-xl bg-muted" />
      </Box>
    );
  } else if (events.length === 0 && eventsQuery.isError) {
    blockingContent = (
      <Box testID="predict-next-error" twClassName="items-center gap-4 p-8">
        <Text>Predictions could not be loaded.</Text>
        <Button onPress={retryAll}>Retry</Button>
      </Box>
    );
  } else if (events.length === 0) {
    blockingContent = (
      <Box testID="predict-next-empty" twClassName="items-center gap-4 p-8">
        <Text>
          {statusQuery.data?.status === 'unavailable'
            ? 'Predictions are unavailable.'
            : 'No predictions yet.'}
        </Text>
        {statusQuery.data?.status === 'unavailable' ? (
          <Button onPress={retryAll}>Retry</Button>
        ) : null}
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 pt-12" testID="predict-next-home">
      <Box twClassName="px-4 pb-2">
        <Text variant={TextVariant.HeadingLg}>Predictions</Text>
      </Box>
      {blockingContent ?? (
        <FlashList
          testID="predict-next-event-feed"
          data={events}
          renderItem={renderEvent}
          keyExtractor={(event) => `${event.venueId}:${event.id}`}
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.5}
          ItemSeparatorComponent={EventSeparator}
          contentContainerStyle={tw.style('px-4')}
          ListFooterComponent={
            eventsQuery.isFetchingNextPage ? (
              <Text testID="predict-next-footer-loading">Loading…</Text>
            ) : paginationError ? (
              <Button
                testID="predict-next-footer-retry"
                variant={ButtonVariant.Tertiary}
                onPress={loadNextPage}
              >
                Retry
              </Button>
            ) : null
          }
        />
      )}
    </Box>
  );
};
