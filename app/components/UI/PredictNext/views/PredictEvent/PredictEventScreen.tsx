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
  IconName,
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
  GameEventHeader,
  StandardEventHeader,
} from './internal/EventHeaders';
import RulesBottomSheet from './internal/RulesBottomSheet';
import { EventMarketList } from './internal/EventMarketList';
import { createMarketGroupProjection } from './internal/createMarketGroupProjection';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectPredictBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/predictBrandRefresh';

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
}) => {
  const isGlassHeader = useSelector(selectPredictBrandRefreshEnabled) === true;
  return (
    <Box
      testID={PredictEventScreenTestIds.VIEW}
      twClassName="flex-1 bg-default"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
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
};

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
      {game ? (
        <GameEventHeader event={event} />
      ) : (
        <StandardEventHeader event={event} />
      )}
      {marketHistory ? (
        <Box twClassName="mt-4 mb-6">{marketHistory}</Box>
      ) : null}
    </Box>
  );
};

/**
 * The Outcome as the Order sheet names it. A threshold line's Outcome is just
 * "Yes" or "No", so it also names the line: "Yes · Josh Jacobs 60+".
 */
const orderOutcomeLabel = (
  market: PredictMarket,
  outcome: PredictOutcome,
): string => {
  const line = formatThresholdLine(market);
  return line ? `${outcome.label} · ${line}` : outcome.label;
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
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
  // The top chart Markets are picked once per Event, so live quotes update
  // their prices without swapping which Markets are charted.
  const [topChart, setTopChart] = useState<{
    eventId: PredictEvent['id'];
    marketIds: readonly PredictMarket['id'][];
  }>();
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
    const firstProjectedMarket =
      marketProjection[0]?.type === 'group'
        ? marketProjection[0].markets[0]
        : marketProjection[0]?.market;
    const moneylineMarkets = getGameMoneylineMarkets(event);
    const historyMarket =
      moneylineMarkets[0] ?? firstProjectedMarket ?? event.markets[0];
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
