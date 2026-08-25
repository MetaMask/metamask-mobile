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
import { findGameSelectionQuote, getEventGame } from '../../events/game';
import {
  MarketList,
  MarketStandardCard,
  SpreadMarketGroupCard,
  TotalMarketGroupCard,
} from '../../events/markets';
import { useEvent } from '../../hooks/useEvent';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import type { PredictMarket } from '../../types';
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
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
  const [selectedMarketIds, setSelectedMarketIds] = useState<
    Record<string, PredictMarket['id']>
  >({});
  const marketProjection = useMemo(
    () => createMarketGroupProjection(query.data?.markets ?? []),
    [query.data?.markets],
  );
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
    },
    [],
  );
  const handleRulesClose = useCallback(() => {
    setRulesTarget(null);
  }, []);

  if (query.data) {
    const event = query.data;
    const eventRules = event.rules?.trim();
    const historyMarket =
      event.markets.find((market) => market.id === selectedMarketId) ??
      event.markets[0];
    const rulesMarket =
      rulesTarget?.type === 'market'
        ? event.markets.find((market) => market.id === rulesTarget.marketId)
        : undefined;
    const game = getEventGame(event);
    const homeQuote = findGameSelectionQuote(event, 'home');
    const awayQuote = findGameSelectionQuote(event, 'away');

    const renderMarketHistory = () => {
      if (game && homeQuote && awayQuote) {
        return (
          <PredictGameMarketHistory
            venueId={event.venueId}
            home={{
              market: homeQuote.market,
              outcome: homeQuote.outcome,
              team: game.homeTeam,
            }}
            away={{
              market: awayQuote.market,
              outcome: awayQuote.outcome,
              team: game.awayTeam,
            }}
          />
        );
      }

      if (historyMarket) {
        return (
          <PredictMarketHistory
            venueId={event.venueId}
            market={historyMarket}
          />
        );
      }

      return null;
    };

    const renderMarket = (projection: (typeof marketProjection)[number]) => {
      if (projection.type === 'standard') {
        return (
          <MarketStandardCard
            key={projection.market.id}
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

      return projection.marketType === 'total' ? (
        <TotalMarketGroupCard key={projection.key} {...groupProps} />
      ) : (
        <SpreadMarketGroupCard key={projection.key} {...groupProps} />
      );
    };

    return (
      <>
        <EventScreenLayout onBack={handleBack}>
          {game ? (
            <GameEventHeader
              event={event}
              onRulesPress={eventRules ? handleEventRulesPress : undefined}
            />
          ) : (
            <StandardEventHeader
              event={event}
              onRulesPress={eventRules ? handleEventRulesPress : undefined}
            />
          )}
          {event.markets.length > 1 && !(game && homeQuote && awayQuote) ? (
            <FilterButtonGroup
              value={historyMarket?.id ?? ''}
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
          <Box
            testID={PredictEventScreenTestIds.PREDICT_SECTION}
            twClassName="mt-8 gap-[14px]"
          >
            <Text variant={TextVariant.HeadingMd}>
              {strings('wallet.predict')}
            </Text>
            <MarketList>{marketProjection.map(renderMarket)}</MarketList>
          </Box>
        </EventScreenLayout>
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
