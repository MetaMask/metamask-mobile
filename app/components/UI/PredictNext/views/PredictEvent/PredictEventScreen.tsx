import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Button,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getEventGame } from '../../events/game';
import { useEvent } from '../../hooks/useEvent';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { TraceName } from '../../../../../util/trace';
import {
  PredictGameMarketHistory,
  PredictMarketHistory,
} from './internal/PredictMarketHistory';
import {
  EventLoadingHeader,
  GameEventHeader,
  StandardEventHeader,
} from './internal/EventHeaders';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';

const styles = StyleSheet.create({
  marketFilter: {
    height: 'auto',
    minHeight: 32,
    maxWidth: 240,
    paddingVertical: 8,
  },
});

const EventScreenLayout = ({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID={PredictEventScreenTestIds.VIEW}
      twClassName="flex-1 bg-default"
    >
      <HeaderStandard
        includesTopInset
        onBack={onBack}
        backButtonProps={{ testID: PredictEventScreenTestIds.BACK }}
      />
      <ScrollView contentContainerStyle={tw.style('flex-grow')}>
        <Box twClassName="flex-1 px-4 pb-8">{children}</Box>
      </ScrollView>
    </Box>
  );
};

export const PredictEventScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, eventId, titleSnapshot } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEvent'>>().params;
  const query = useEvent(venueId, eventId);
  const [hasBlockingError, setHasBlockingError] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string>();
  usePredictNextMeasurement({
    traceName: TraceName.PredictNextEventView,
    conditions: [!query.isLoading],
    debugContext: {
      hasEvent: Boolean(query.data),
      error: query.isError,
    },
  });
  useEffect(() => {
    if (query.isError) {
      setHasBlockingError(true);
    } else if (query.data) {
      setHasBlockingError(false);
    }
  }, [query.data, query.isError]);
  const handleBack = useCallback(
    () =>
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate(PredictNextRoutes.HOME),
    [navigation],
  );

  const event = query.data;
  const selectedMarket =
    event?.markets.find((market) => market.id === selectedMarketId) ??
    event?.markets[0];
  const game = event ? getEventGame(event) : undefined;
  const homeMarket = event?.markets.find((market) =>
    market.outcomes.some(
      (outcome) => outcome.side === 'yes' && outcome.gameSelection === 'home',
    ),
  );
  const awayMarket = event?.markets.find((market) =>
    market.outcomes.some(
      (outcome) => outcome.side === 'yes' && outcome.gameSelection === 'away',
    ),
  );

  if (event) {
    return (
      <EventScreenLayout onBack={handleBack}>
        <Box twClassName="gap-6">
          {game ? (
            <GameEventHeader event={event} />
          ) : (
            <StandardEventHeader event={event} />
          )}
          {event.markets.length > 1 && !(game && homeMarket && awayMarket) ? (
            <FilterButtonGroup
              value={selectedMarket?.id ?? ''}
              onChange={setSelectedMarketId}
              variant={FilterButtonVariant.Secondary}
              testID={PredictEventScreenTestIds.MARKETS}
            >
              {event.markets.map((market) => (
                <FilterButton
                  key={market.id}
                  value={market.id}
                  accessibilityRole="tab"
                  accessibilityState={{
                    selected: selectedMarket?.id === market.id,
                  }}
                  style={styles.marketFilter}
                  textProps={{ numberOfLines: 3, ellipsizeMode: 'tail' }}
                  testID={PredictEventScreenTestIds.market(market.id)}
                >
                  {market.question}
                </FilterButton>
              ))}
            </FilterButtonGroup>
          ) : null}
          {game && homeMarket && awayMarket ? (
            <PredictGameMarketHistory
              venueId={event.venueId}
              home={{ market: homeMarket, team: game.homeTeam }}
              away={{ market: awayMarket, team: game.awayTeam }}
            />
          ) : selectedMarket ? (
            <PredictMarketHistory
              venueId={event.venueId}
              market={selectedMarket}
            />
          ) : null}
        </Box>
      </EventScreenLayout>
    );
  }

  if (query.isError || hasBlockingError) {
    return (
      <EventScreenLayout onBack={handleBack}>
        <Box twClassName="gap-6">
          <Text
            testID={PredictEventScreenTestIds.TITLE}
            accessibilityRole="header"
            variant={TextVariant.HeadingLg}
          >
            {titleSnapshot}
          </Text>
          <Box
            testID={PredictEventScreenTestIds.ERROR}
            twClassName="items-start gap-3 py-4"
          >
            <Text
              testID={PredictEventScreenTestIds.ERROR_MESSAGE}
              variant={TextVariant.BodyMd}
            >
              Unable to load this event.
            </Text>
            <Button
              testID={PredictEventScreenTestIds.RETRY}
              variant={ButtonVariant.Tertiary}
              isDisabled={query.isFetching}
              isLoading={query.isFetching}
              onPress={() => query.refetch()}
            >
              Retry
            </Button>
          </Box>
        </Box>
      </EventScreenLayout>
    );
  }

  return (
    <EventScreenLayout onBack={handleBack}>
      <EventLoadingHeader title={titleSnapshot} />
    </EventScreenLayout>
  );
};
