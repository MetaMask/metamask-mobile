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
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PREDICT_MARKET_TYPES } from '../../constants';
import { findWinnerMarketQuotes, getEventGame } from '../../events/game';
import {
  MarketFooterCard,
  MarketList,
  MarketStandardCard,
  SpreadMarketGroupCard,
  TotalMarketGroupCard,
} from '../../events/markets';
import { useEvent } from '../../hooks/useEvent';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import type { PredictEvent, PredictMarket } from '../../types';
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
import {
  createMarketGroupProjection,
  type MarketGroupProjection,
} from './internal/createMarketGroupProjection';
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

const getProjectionKey = (projection: MarketGroupProjection) =>
  projection.type === 'group' ? projection.key : projection.market.id;

const EventScreenChrome = ({
  children,
  footer,
  onBack,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack: () => void;
}) => (
  <Box testID={PredictEventScreenTestIds.VIEW} twClassName="flex-1 bg-default">
    <HeaderStandard
      includesTopInset
      onBack={onBack}
      backButtonProps={{ testID: PredictEventScreenTestIds.BACK }}
    />
    {children}
    {footer}
  </Box>
);

const EventScreenLayout = ({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) => {
  const tw = useTailwind();

  return (
    <EventScreenChrome onBack={onBack}>
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
  selectedMarketId,
  showPredictTitle,
  onSelectMarket,
  onEventRulesPress,
}: {
  event: PredictEvent;
  winnerQuotes?: WinnerQuotes;
  historyMarket?: PredictMarket;
  selectedMarketId?: string;
  showPredictTitle: boolean;
  onSelectMarket: (marketId: string) => void;
  onEventRulesPress?: () => void;
}) => {
  const game = getEventGame(event);

  const renderMarketHistory = () => {
    if (selectedMarketId) {
      const selectedMarket = event.markets.find(
        (market) => market.id === selectedMarketId,
      );
      if (selectedMarket) {
        return (
          <PredictMarketHistory
            venueId={event.venueId}
            market={selectedMarket}
          />
        );
      }
    }

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

    if (historyMarket) {
      return (
        <PredictMarketHistory venueId={event.venueId} market={historyMarket} />
      );
    }

    return null;
  };

  return (
    <Box>
      {game ? (
        <GameEventHeader event={event} onRulesPress={onEventRulesPress} />
      ) : (
        <StandardEventHeader event={event} onRulesPress={onEventRulesPress} />
      )}
      {event.markets.length > 1 && !winnerQuotes ? (
        <FilterButtonGroup
          value={historyMarket?.id ?? ''}
          onChange={onSelectMarket}
          variant={FilterButtonVariant.Secondary}
          testID={PredictEventScreenTestIds.MARKETS}
        >
          {event.markets.map((market) => (
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
      {renderMarketHistory()}
      {showPredictTitle ? (
        <Box
          testID={PredictEventScreenTestIds.PREDICT_SECTION}
          twClassName="mt-8 pb-[14px]"
        >
          <Text variant={TextVariant.HeadingMd}>
            {strings('wallet.predict')}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

export const PredictEventScreen = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, eventId, titleSnapshot } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEvent'>>().params;
  const query = useEvent(venueId, eventId);
  const [hasBlockingError, setHasBlockingError] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string>();
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
  const [selectedMarketIds, setSelectedMarketIds] = useState<
    Record<string, PredictMarket['id']>
  >({});
  const winnerQuotes = useMemo(
    () => (query.data ? findWinnerMarketQuotes(query.data) : undefined),
    [query.data],
  );
  const winnerMarketIds = useMemo(
    () =>
      new Set(
        winnerQuotes
          ? [
              winnerQuotes.away.market.id,
              winnerQuotes.home.market.id,
              ...(winnerQuotes.draw ? [winnerQuotes.draw.market.id] : []),
            ]
          : [],
      ),
    [winnerQuotes],
  );
  const marketProjection = useMemo(
    () =>
      createMarketGroupProjection(
        (query.data?.markets ?? []).filter(
          (market) => !winnerMarketIds.has(market.id),
        ),
      ),
    [query.data?.markets, winnerMarketIds],
  );
  const listContentContainerStyle = useMemo(() => tw.style('px-4'), [tw]);
  usePredictNextMeasurement({
    traceName: TraceName.PredictNextEventView,
    conditions: [!query.isLoading],
    debugContext: {
      hasEvent: Boolean(query.data),
      error: query.isError,
      marketCount: query.data?.markets.length ?? 0,
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
    setSelectedMarketIds({});
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
  const handleGroupMarketSelect = useCallback(
    (groupKey: string, marketId: PredictMarket['id']) => {
      setSelectedMarketIds((current) => ({
        ...current,
        [groupKey]: marketId,
      }));
      setSelectedMarketId(marketId);
    },
    [],
  );
  const handleMarketSelect = useCallback(
    (marketId: string) => {
      setSelectedMarketId(marketId);
      const market = query.data?.markets.find(
        (candidate) => candidate.id === marketId,
      );
      const groupKey =
        market?.group?.groupType === 'marketSelector'
          ? market.group.key
          : undefined;
      if (groupKey !== undefined && market !== undefined) {
        setSelectedMarketIds((current) => ({
          ...current,
          [groupKey]: market.id,
        }));
      }
    },
    [query.data?.markets],
  );
  const handleRulesClose = useCallback(() => {
    setRulesTarget(null);
  }, []);
  const handleWinnerSelect = useCallback((marketId: string) => {
    setSelectedMarketId((current) =>
      current === marketId ? undefined : marketId,
    );
  }, []);
  const renderMarket = useCallback(
    (projection: MarketGroupProjection) => {
      if (projection.type === 'standard') {
        return (
          <MarketStandardCard
            market={projection.market}
            onRulesPress={handleMarketRulesPress}
          />
        );
      }

      const activeMarket =
        projection.markets.find(
          (market) => market.id === selectedMarketIds[projection.key],
        ) ?? projection.markets[0];
      if (!activeMarket) {
        return null;
      }

      const groupProps = {
        groupKey: projection.key,
        markets: projection.markets,
        selectedMarket: activeMarket,
        onSelectMarket: (marketId: PredictMarket['id']) =>
          handleGroupMarketSelect(projection.key, marketId),
        onRulesPress: handleMarketRulesPress,
      };

      return projection.marketType === PREDICT_MARKET_TYPES.TOTAL ? (
        <TotalMarketGroupCard {...groupProps} />
      ) : (
        <SpreadMarketGroupCard {...groupProps} />
      );
    },
    [handleGroupMarketSelect, handleMarketRulesPress, selectedMarketIds],
  );

  if (query.data) {
    const event = query.data;
    const eventRules = event.rules?.trim();
    const firstProjectedMarket =
      marketProjection[0]?.type === 'group'
        ? marketProjection[0].markets[0]
        : marketProjection[0]?.market;
    const historyMarket =
      event.markets.find((market) => market.id === selectedMarketId) ??
      firstProjectedMarket ??
      event.markets[0];
    const rulesMarket =
      rulesTarget?.type === 'market'
        ? event.markets.find((market) => market.id === rulesTarget.marketId)
        : undefined;
    const game = getEventGame(event);

    return (
      <>
        <EventScreenChrome
          onBack={handleBack}
          footer={
            game && winnerQuotes ? (
              <MarketFooterCard
                game={game}
                awayQuote={winnerQuotes.away}
                homeQuote={winnerQuotes.home}
                drawQuote={winnerQuotes.draw}
                selectedMarketId={selectedMarketId}
                onSelectMarket={handleWinnerSelect}
              />
            ) : undefined
          }
        >
          <MarketList
            data={marketProjection}
            extraData={selectedMarketIds}
            keyExtractor={getProjectionKey}
            renderItem={renderMarket}
            contentContainerStyle={listContentContainerStyle}
            ListHeaderComponent={
              <EventLoadedHeader
                event={event}
                winnerQuotes={winnerQuotes}
                historyMarket={historyMarket}
                selectedMarketId={selectedMarketId}
                showPredictTitle={marketProjection.length > 0}
                onSelectMarket={handleMarketSelect}
                onEventRulesPress={
                  eventRules ? handleEventRulesPress : undefined
                }
              />
            }
          />
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
    <EventScreenLayout onBack={handleBack}>
      <EventLoadingHeader title={titleSnapshot} />
    </EventScreenLayout>
  );
};
