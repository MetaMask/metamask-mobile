import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
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
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  findWinnerMarketQuotes,
  getEventGame,
  getGameMoneylineMarkets,
} from '../../events/game';
import { useEvent } from '../../hooks/useEvent';
import { useEventWithLiveData } from '../../hooks/useEventWithLiveData';
import type { LiveMarketWatchScope } from '../../hooks/useEventsWithLiveData';
import { getOutcomeName } from '../../utils/entryCopy';
import { formatThresholdLine } from '../../events/shared/formatting';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
} from '../../types';
import { usePredictOrderFlow } from '../PredictOrderFlow';
import { TraceName } from '../../../../../util/trace';
import {
  PredictGameMarketHistory,
  PredictMarketHistory,
  PredictTopMarketsHistory,
} from './internal/PredictMarketHistory';
import { selectTopChartMarkets } from './internal/selectTopChartMarkets';
import {
  EventLoadingHeader,
  EventTitleHeader,
  GameEventHeader,
  StandardEventHeader,
} from './internal/EventHeaders';
import RulesBottomSheet from './internal/RulesBottomSheet';
import { EventMarketList } from './internal/EventMarketList';
import {
  createMarketGroupProjection,
  type MarketGroupProjection,
} from './internal/createMarketGroupProjection';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';

type RulesTarget =
  | { type: 'event' }
  | { type: 'market'; marketId: PredictMarket['id'] }
  | null;

type WinnerQuotes = NonNullable<ReturnType<typeof findWinnerMarketQuotes>>;

const NO_MARKET_IDS: readonly PredictMarket['id'][] = [];

/**
 * The single Market the header charts when there is neither a Game chart nor
 * a top-Markets chart: the first moneyline, else the first listed Market.
 */
const getHistoryMarket = (
  event: PredictEvent,
  marketProjection: readonly MarketGroupProjection[],
): PredictMarket | undefined => {
  const firstProjectedMarket =
    marketProjection[0]?.type === 'group'
      ? marketProjection[0].markets[0]
      : marketProjection[0]?.market;
  return (
    getGameMoneylineMarkets(event)[0] ??
    firstProjectedMarket ??
    event.markets[0]
  );
};

/**
 * Market ids the header chart prices, following the same choice as
 * {@link EventLoadedHeader}: both winner lines of a Game, the top Markets of
 * a multi-Market Event, or the single history Market. Picking these Markets
 * reads only their identity, so the REST Event answers before live data does.
 */
const getChartMarketIds = (
  event: PredictEvent,
  topChartMarketIds: readonly PredictMarket['id'][],
): readonly PredictMarket['id'][] => {
  const game = getEventGame(event);
  const winnerQuotes = game ? findWinnerMarketQuotes(event) : undefined;
  if (winnerQuotes) {
    return [winnerQuotes.away.market.id, winnerQuotes.home.market.id];
  }
  if (!game && event.markets.length > 1) {
    return topChartMarketIds;
  }
  const historyMarket = getHistoryMarket(
    event,
    createMarketGroupProjection(event.markets),
  );
  return historyMarket ? [historyMarket.id] : NO_MARKET_IDS;
};

const EventScreenChrome = ({
  children,
  header,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
}) => (
  <Box testID={PredictEventScreenTestIds.VIEW} twClassName="flex-1 bg-default">
    {header}
    {children}
  </Box>
);

const EventScreenLayout = ({
  children,
  onBack,
  title,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title?: string;
}) => {
  const tw = useTailwind();

  return (
    <EventScreenChrome
      header={<EventTitleHeader title={title} onBack={onBack} />}
    >
      <ScrollView contentContainerStyle={tw.style('flex-grow')}>
        <Box twClassName="flex-1 px-4 pb-8">{children}</Box>
      </ScrollView>
    </EventScreenChrome>
  );
};

const EventLoadedHeader = ({
  event,
  winnerQuotes,
  historyMarket,
  topChartMarkets,
}: {
  event: PredictEvent;
  winnerQuotes?: WinnerQuotes;
  historyMarket?: PredictMarket;
  topChartMarkets: readonly PredictMarket[];
}) => {
  const game = getEventGame(event);

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

    if (!game && event.markets.length > 1) {
      return topChartMarkets.length > 0 ? (
        <PredictTopMarketsHistory
          venueId={event.venueId}
          markets={topChartMarkets}
        />
      ) : null;
    }

    if (historyMarket) {
      return (
        <PredictMarketHistory
          venueId={event.venueId}
          market={historyMarket}
          isStandardEvent={!game}
        />
      );
    }

    return null;
  };

  const marketHistory = renderMarketHistory();

  return (
    <Box>
      {game ? <GameEventHeader event={event} /> : null}
      {marketHistory ? (
        <Box twClassName="mt-4 mb-6">{marketHistory}</Box>
      ) : null}
    </Box>
  );
};

/**
 * The Outcome as the Order sheet names it. A threshold line's Outcome is just
 * "Yes" or "No", so it also names the line: "Yes · Josh Jacobs · 60+".
 */
const orderOutcomeLabel = (
  market: PredictMarket,
  outcome: PredictOutcome,
): string => {
  const line = formatThresholdLine(market);
  return line
    ? strings('predict.market_groups.threshold_order_outcome', {
        outcome: outcome.label,
        line,
      })
    : outcome.label;
};

export const PredictEventScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, eventId, titleSnapshot } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEvent'>>().params;
  const query = useEvent(venueId, eventId);
  // The Markets the list renders in its current state (open sections, the
  // selected period and line). Reported by the list, which owns that state.
  const [listMarketIds, setListMarketIds] =
    useState<readonly PredictMarket['id'][]>(NO_MARKET_IDS);
  // The top chart Markets are picked once per Event, so live quotes update
  // their prices without swapping which Markets are charted.
  const [topChart, setTopChart] = useState<{
    eventId: PredictEvent['id'];
    marketIds: readonly PredictMarket['id'][];
  }>();
  const topChartMarketIds =
    topChart?.eventId === query.data?.id ? topChart?.marketIds : undefined;
  // Live prices follow what is on screen: the chart's Markets and the list's,
  // never the whole Event, so a full Game stays under the connection cap.
  const marketScope = useMemo<LiveMarketWatchScope>(
    () => ({
      type: 'visible',
      marketIds: [
        ...(query.data
          ? getChartMarketIds(query.data, topChartMarketIds ?? NO_MARKET_IDS)
          : NO_MARKET_IDS),
        ...listMarketIds,
      ],
    }),
    [listMarketIds, query.data, topChartMarketIds],
  );
  const liveEvent = useEventWithLiveData(venueId, query.data, { marketScope });
  const { openOrderFlow } = usePredictOrderFlow();
  const [hasBlockingError, setHasBlockingError] = useState(false);
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
  if (liveEvent && topChart?.eventId !== liveEvent.id) {
    setTopChart({
      eventId: liveEvent.id,
      marketIds: selectTopChartMarkets(liveEvent.markets).map(
        (market) => market.id,
      ),
    });
  }
  const topChartMarkets = useMemo(
    () =>
      (topChart?.marketIds ?? []).flatMap((marketId) => {
        const market = liveEvent?.markets.find(
          (candidate) => candidate.id === marketId,
        );
        return market ? [market] : [];
      }),
    [liveEvent?.markets, topChart],
  );
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
          (market && outcome && orderOutcomeLabel(market, outcome)) ??
          getOutcomeName(position.side, position.context),
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
        outcomeLabel: orderOutcomeLabel(market, outcome),
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
    const onEventRulesPress = eventRules ? handleEventRulesPress : undefined;
    const isGameEvent = Boolean(getEventGame(event));
    const historyMarket = getHistoryMarket(event, marketProjection);
    const rulesMarket =
      rulesTarget?.type === 'market'
        ? event.markets.find((market) => market.id === rulesTarget.marketId)
        : undefined;

    return (
      <>
        <EventScreenChrome
          header={
            isGameEvent ? (
              <EventTitleHeader
                title={event.title}
                onBack={handleBack}
                onRulesPress={onEventRulesPress}
              />
            ) : (
              <StandardEventHeader
                event={event}
                onBack={handleBack}
                onRulesPress={onEventRulesPress}
              />
            )
          }
        >
          <EventMarketList
            event={event}
            onOrder={handleMarketOrder}
            onRulesPress={handleMarketRulesPress}
            onCashOut={handlePositionCashOut}
            onVisibleMarketIdsChange={setListMarketIds}
          >
            <EventLoadedHeader
              event={event}
              winnerQuotes={winnerQuotes}
              historyMarket={historyMarket}
              topChartMarkets={topChartMarkets}
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
