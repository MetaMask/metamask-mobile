import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Button,
  ButtonVariant,
  HeaderSearch,
  HeaderSearchVariant,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import {
  SEARCH_QUERY_MAX_LENGTH,
  useSearchEvents,
} from '../../hooks/useSearchEvents';
import { useEventsWithLiveData } from '../../hooks/useEventsWithLiveData';
import { PredictEventCard } from '../../events/cards';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import type { PredictEvent } from '../../types';
import { usePredictOrderFlow } from '../PredictOrderFlow';
import { strings } from '../../../../../../locales/i18n';
import { PredictSearchScreenTestIds } from './PredictSearchScreen.testIds';

const SEARCH_DEBOUNCE_MS = 300;
const NO_EVENTS: readonly PredictEvent[] = [];

const getEventKey = (event: PredictEvent) => `${event.venueId}-${event.id}`;
const EventSeparator = () => <Box twClassName="h-3" />;

interface SearchEventRowProps {
  event: PredictEvent;
  onOpenEvent: (event: PredictEvent) => void;
}

const SearchEventRow = React.memo(
  ({ event, onOpenEvent }: SearchEventRowProps) => {
    const { openOrderFlow } = usePredictOrderFlow();

    return (
      <PredictEventCard
        event={event}
        variant="featured"
        onPress={() => onOpenEvent(event)}
        onOrder={(cardEvent, market, outcome) =>
          openOrderFlow({
            venueId: cardEvent.venueId,
            marketId: market.id,
            side: outcome.side,
            outcomeLabel: outcome.label,
            eventTitle: cardEvent.title,
            eventImageUrl: cardEvent.imageUrl,
            askPrice: outcome.askPrice,
          })
        }
      />
    );
  },
);

const Message = ({ testID, text }: { testID: string; text: string }) => (
  <Box testID={testID} twClassName="items-center px-4 py-8">
    <Text color={TextColor.TextAlternative}>{text}</Text>
  </Box>
);

const SearchLoading = () => (
  <Box
    testID={PredictSearchScreenTestIds.LOADING}
    twClassName="gap-3 px-3 pt-2"
  >
    <Box twClassName="h-40 rounded-2xl bg-muted" />
    <Box twClassName="h-40 rounded-2xl bg-muted" />
  </Box>
);

const SearchError = ({ onRetry }: { onRetry: () => void }) => (
  <Box
    testID={PredictSearchScreenTestIds.ERROR}
    twClassName="items-start gap-2 px-4 py-6"
  >
    <Text>{strings('predict_next.search.error')}</Text>
    <Button
      testID={PredictSearchScreenTestIds.RETRY}
      variant={ButtonVariant.Tertiary}
      onPress={onRetry}
    >
      {strings('predict_next.search.retry')}
    </Button>
  </Box>
);

export const PredictSearchScreen = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextSearch'>>()
      .params;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const hasQuery = debouncedQuery.trim().length > 0;
  const isDebouncing = query.trim() !== debouncedQuery.trim();
  const { data, isError, isLoading, refetch } = useSearchEvents(
    venueId,
    debouncedQuery,
  );
  const resultEvents = data?.events ?? NO_EVENTS;
  const events = useEventsWithLiveData(venueId, resultEvents, {
    marketScope: 'card',
  });
  const listContentContainerStyle = useMemo(
    () => tw.style('px-3', { paddingBottom: insets.bottom + 24 }),
    [tw, insets.bottom],
  );

  const handleClose = useCallback(
    () =>
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate(PredictNextRoutes.HOME),
    [navigation],
  );
  const handleOpenEvent = useCallback(
    (event: PredictEvent) =>
      navigation.navigate(PredictNextRoutes.EVENT, {
        venueId: event.venueId,
        eventId: event.id,
        titleSnapshot: event.title,
      }),
    [navigation],
  );
  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PredictEvent>) => (
      <SearchEventRow event={item} onOpenEvent={handleOpenEvent} />
    ),
    [handleOpenEvent],
  );

  let content: React.ReactNode;
  if (!hasQuery && !isDebouncing) {
    content = (
      <Message
        testID={PredictSearchScreenTestIds.IDLE}
        text={strings('predict_next.search.idle')}
      />
    );
  } else if (isLoading || isDebouncing) {
    content = <SearchLoading />;
  } else if (isError) {
    content = <SearchError onRetry={handleRetry} />;
  } else if (events.length === 0) {
    content = (
      <Message
        testID={PredictSearchScreenTestIds.EMPTY}
        text={strings('predict_next.search.empty', {
          query: debouncedQuery.trim(),
        })}
      />
    );
  } else {
    content = (
      <FlatList
        testID={PredictSearchScreenTestIds.LIST}
        data={events}
        renderItem={renderItem}
        keyExtractor={getEventKey}
        ItemSeparatorComponent={EventSeparator}
        contentContainerStyle={listContentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <Box
      testID={PredictSearchScreenTestIds.VIEW}
      twClassName="flex-1 bg-default"
      style={{ paddingTop: insets.top }}
    >
      <HeaderSearch
        variant={HeaderSearchVariant.Inline}
        twClassName="px-4"
        onPressCancelButton={handleClose}
        cancelButtonProps={{ testID: PredictSearchScreenTestIds.CANCEL }}
        textFieldSearchProps={{
          value: query,
          onChangeText: setQuery,
          onPressClearButton: () => setQuery(''),
          placeholder: strings('predict_next.search.placeholder'),
          autoFocus: true,
          inputProps: {
            autoCorrect: false,
            maxLength: SEARCH_QUERY_MAX_LENGTH,
            returnKeyType: 'search',
            testID: PredictSearchScreenTestIds.INPUT,
          },
          clearButtonProps: { testID: PredictSearchScreenTestIds.CLEAR },
        }}
      />
      <Box twClassName="flex-1 pt-2">{content}</Box>
    </Box>
  );
};
