import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { findWinnerMarketQuotes, getEventGame } from '../../events/game';
import { useEvent } from '../../hooks/useEvent';
import { useEventWithLiveData } from '../../hooks/useEventWithLiveData';
import { getOutcomeName } from '../../utils/entryCopy';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import type { PredictEvent, PredictMarket, PredictPosition } from '../../types';
import { usePredictOrderFlow } from '../PredictOrderFlow';
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
import RulesBottomSheet from './internal/RulesBottomSheet';
import { EventMarketList } from './internal/EventMarketList';
import { createMarketGroupProjection } from './internal/createMarketGroupProjection';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';

const styles = StyleSheet.create({
  marketFilter: {
    height: 'auto',
    minHeight: 32,
    maxWidth: 240,
    paddingVertical: 8,
  },
});

type RulesTarget =
  | { type: 'event' }
  | { type: 'market'; marketId: PredictMarket['id'] }
  | null;

type WinnerQuotes = NonNullable<ReturnType<typeof findWinnerMarketQuotes>>;

const EventScreenChrome = ({
  children,
  onBack,
  title,
  onRulesPress,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title?: string;
  onRulesPress?: () => void;
}) => (
  <Box testID={PredictEventScreenTestIds.VIEW} twClassName="flex-1 bg-default">
    <HeaderStandard
      includesTopInset
      title={title}
      titleProps={{
        testID: PredictEventScreenTestIds.TITLE,
        accessibilityRole: 'header',
        numberOfLines: 1,
      }}
      onBack={onBack}
      backButtonProps={{ testID: PredictEventScreenTestIds.BACK }}
      endButtonIconProps={
        onRulesPress
          ? [
              {
                iconName: IconName.Question,
                onPress: onRulesPress,
                testID: PredictEventScreenTestIds.EVENT_RULES_BUTTON,
                accessibilityLabel: strings(
                  'predict.rules.event_accessibility_label',
                ),
                accessibilityRole: 'button',
              },
            ]
          : undefined
      }
    />
    {children}
  </Box>
);

const EventScreenLayout = ({
  children,
  onBack,
  title,
  onRulesPress,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title?: string;
  onRulesPress?: () => void;
}) => {
  const tw = useTailwind();

  return (
    <EventScreenChrome
      onBack={onBack}
      title={title}
      onRulesPress={onRulesPress}
    >
      <ScrollView contentContainerStyle={tw.style('flex-grow')}>
        <Box twClassName="flex-1 px-4 pb-8">{children}</Box>
      </ScrollView>
    </EventScreenChrome>
  );
};

const isUngroupedMarket = (market: PredictMarket) => market.group === undefined;

const EventLoadedHeader = ({
  event,
  winnerQuotes,
  historyMarket,
  selectedMarketId,
  onSelectMarket,
}: {
  event: PredictEvent;
  winnerQuotes?: WinnerQuotes;
  historyMarket?: PredictMarket;
  selectedMarketId?: string;
  onSelectMarket: (marketId: string) => void;
}) => {
  const game = getEventGame(event);
  const chartMarkets = event.markets.filter(isUngroupedMarket);
  const selectedChartMarket = chartMarkets.find(
    (market) => market.id === selectedMarketId,
  );

  const renderMarketHistory = () => {
    if (game && winnerQuotes) {
      return (
        <PredictGameMarketHistory
          venueId={event.venueId}
          home={{
            market: winnerQuotes.home.market,
            outcome: winnerQuotes.home.outcome,
            team: game.homeTeam,
          }}
          away={{
            market: winnerQuotes.away.market,
            outcome: winnerQuotes.away.outcome,
            team: game.awayTeam,
          }}
        />
      );
    }

    const market = selectedChartMarket ?? historyMarket;
    if (market) {
      return <PredictMarketHistory venueId={event.venueId} market={market} />;
    }

    return null;
  };

  return (
    <Box>
      {game ? (
        <GameEventHeader event={event} />
      ) : (
        <StandardEventHeader event={event} />
      )}
      {!game && !winnerQuotes && chartMarkets.length > 1 ? (
        <FilterButtonGroup
          value={historyMarket?.id ?? ''}
          onChange={onSelectMarket}
          variant={FilterButtonVariant.Secondary}
          testID={PredictEventScreenTestIds.MARKETS}
        >
          {chartMarkets.map((market) => (
            <FilterButton
              key={market.id}
              value={market.id}
              accessibilityRole="tab"
              accessibilityState={{
                selected: historyMarket?.id === market.id,
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
      <Box twClassName="mt-4 mb-6">{renderMarketHistory()}</Box>
    </Box>
  );
};

export const PredictEventScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, eventId, titleSnapshot } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEvent'>>().params;
  const query = useEvent(venueId, eventId);
  const liveEvent = useEventWithLiveData(venueId, query.data);
  const { openOrderFlow } = usePredictOrderFlow();
  const [hasBlockingError, setHasBlockingError] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string>();
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
  const winnerQuotes = useMemo(
    () => (liveEvent ? findWinnerMarketQuotes(liveEvent) : undefined),
    [liveEvent],
  );
  const marketProjection = useMemo(
    () => createMarketGroupProjection(liveEvent?.markets ?? []),
    [liveEvent?.markets],
  );
  usePredictNextMeasurement({
    traceName: TraceName.PredictNextEventView,
    conditions: [!query.isLoading],
    debugContext: {
      hasEvent: Boolean(liveEvent),
      error: query.isError,
      marketCount: liveEvent?.markets.length ?? 0,
      projectionCount: marketProjection.length,
    },
  });
  useEffect(() => {
    if (query.isError) {
      setHasBlockingError(true);
    } else if (query.data) {
      setHasBlockingError(false);
    }
  }, [query.data, query.isError]);
  useEffect(() => {
    setSelectedMarketId(undefined);
    setRulesTarget(null);
  }, [eventId]);
  const handleBack = useCallback(
    () =>
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate(PredictNextRoutes.HOME),
    [navigation],
  );
  const handleEventRulesPress = useCallback(() => {
    setRulesTarget({ type: 'event' });
  }, []);
  const handleMarketRulesPress = useCallback((market: PredictMarket) => {
    setRulesTarget({ type: 'market', marketId: market.id });
  }, []);
  const handleMarketSelect = useCallback((marketId: string) => {
    setSelectedMarketId(marketId);
  }, []);
  const handleRulesClose = useCallback(() => {
    setRulesTarget(null);
  }, []);
  /** Opens the shared Order flow as a Cash Out: a sell bounded by the
   * Position's whole-contract size. Canonical identity comes from the
   * presented Event; display context falls back to the Position's catalog
   * context only when the live Event cannot supply it. */
  const handlePositionCashOut = useCallback(
    (position: PredictPosition) => {
      if (!liveEvent) {
        return;
      }
      const market = liveEvent.markets.find(
        (candidate) => candidate.id === position.marketId,
      );
      const outcome = market?.outcomes.find(
        (candidate) => candidate.side === position.side,
      );
      openOrderFlow({
        action: 'sell',
        eventId,
        venueId,
        marketId: position.marketId,
        side: position.side,
        outcomeLabel:
          outcome?.label ?? getOutcomeName(position.side, position.context),
        eventTitle: liveEvent.title,
        eventImageUrl: liveEvent.imageUrl,
        maxContracts: Math.floor(Number(position.shares)),
      });
    },
    [eventId, liveEvent, openOrderFlow, venueId],
  );
  const handleMarketOrder = useCallback(
    (market: PredictMarket, outcome: (typeof market.outcomes)[number]) => {
      openOrderFlow({
        action: 'buy',
        eventId,
        venueId,
        marketId: market.id,
        side: outcome.side,
        outcomeLabel: outcome.label,
        eventTitle: liveEvent?.title ?? '',
        eventImageUrl: liveEvent?.imageUrl,
        askPrice: outcome.askPrice,
      });
    },
    [eventId, liveEvent?.title, liveEvent?.imageUrl, openOrderFlow, venueId],
  );
  if (liveEvent) {
    const event = liveEvent;
    const eventRules = event.rules?.trim();
    const firstProjectedMarket =
      marketProjection[0]?.type === 'group'
        ? marketProjection[0].markets[0]
        : marketProjection[0]?.market;
    const historyMarket =
      event.markets.find(
        (market) => market.id === selectedMarketId && isUngroupedMarket(market),
      ) ??
      event.markets.find(isUngroupedMarket) ??
      firstProjectedMarket ??
      event.markets[0];
    const rulesMarket =
      rulesTarget?.type === 'market'
        ? event.markets.find((market) => market.id === rulesTarget.marketId)
        : undefined;

    return (
      <>
        <EventScreenChrome
          title={event.title}
          onBack={handleBack}
          onRulesPress={eventRules ? handleEventRulesPress : undefined}
        >
          <EventMarketList
            event={event}
            onOrder={handleMarketOrder}
            onRulesPress={handleMarketRulesPress}
            onCashOut={handlePositionCashOut}
          >
            <EventLoadedHeader
              event={event}
              winnerQuotes={winnerQuotes}
              historyMarket={historyMarket}
              selectedMarketId={selectedMarketId}
              onSelectMarket={handleMarketSelect}
            />
          </EventMarketList>
        </EventScreenChrome>
        <RulesBottomSheet
          isVisible={rulesTarget !== null}
          eventRules={eventRules}
          market={rulesMarket}
          settlementSources={event.settlementSources}
          onClose={handleRulesClose}
        />
      </>
    );
  }

  if (query.isError || hasBlockingError) {
    return (
      <EventScreenLayout title={titleSnapshot} onBack={handleBack}>
        <Box twClassName="gap-6">
          <Box
            testID={PredictEventScreenTestIds.ERROR}
            twClassName="items-start gap-3 py-4"
          >
            <Text
              testID={PredictEventScreenTestIds.ERROR_MESSAGE}
              variant={TextVariant.BodyMd}
            >
              {strings('predict.event.unable_to_load')}
            </Text>
            <Button
              testID={PredictEventScreenTestIds.RETRY}
              variant={ButtonVariant.Tertiary}
              isDisabled={query.isFetching}
              isLoading={query.isFetching}
              onPress={() => query.refetch()}
            >
              {strings('predict.error.retry')}
            </Button>
          </Box>
        </Box>
      </EventScreenLayout>
    );
  }

  return (
    <EventScreenLayout title={titleSnapshot} onBack={handleBack}>
      <EventLoadingHeader />
    </EventScreenLayout>
  );
};
