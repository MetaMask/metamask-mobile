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
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getEventGame } from '../../events/game';
import { MarketList, MarketStandardCard } from '../../events/markets';
import { useEvent } from '../../hooks/useEvent';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import type { PredictEvent, PredictMarket } from '../../types';
import { TraceName } from '../../../../../util/trace';
import {
  EventLoadingHeader,
  GameEventHeader,
  StandardEventHeader,
} from './internal/EventHeaders';
import RulesBottomSheet from './internal/RulesBottomSheet';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';

type RulesTarget =
  | { type: 'event' }
  | { type: 'market'; marketId: PredictMarket['id'] }
  | null;

const EventScreenChrome = ({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) => (
  <Box testID={PredictEventScreenTestIds.VIEW} twClassName="flex-1 bg-default">
    <HeaderStandard
      includesTopInset
      onBack={onBack}
      backButtonProps={{ testID: PredictEventScreenTestIds.BACK }}
    />
    {children}
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

const EventDetailHeader = ({
  event,
  onEventRulesPress,
}: {
  event: PredictEvent;
  onEventRulesPress?: () => void;
}) => (
  <Box>
    {getEventGame(event) ? (
      <GameEventHeader event={event} onRulesPress={onEventRulesPress} />
    ) : (
      <StandardEventHeader event={event} onRulesPress={onEventRulesPress} />
    )}
    <Box
      testID={PredictEventScreenTestIds.PREDICT_SECTION}
      twClassName="mt-8 pb-[14px]"
    >
      <Text variant={TextVariant.HeadingMd}>{strings('wallet.predict')}</Text>
    </Box>
  </Box>
);

export const PredictEventScreen = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, eventId, titleSnapshot } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEvent'>>().params;
  const query = useEvent(venueId, eventId);
  const [hasBlockingError, setHasBlockingError] = useState(false);
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
  const listContentContainerStyle = useMemo(() => tw.style('px-4'), [tw]);
  usePredictNextMeasurement({
    traceName: TraceName.PredictNextEventView,
    conditions: [!query.isLoading],
    debugContext: {
      hasEvent: Boolean(query.data),
      error: query.isError,
      marketCount: query.data?.markets.length ?? 0,
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
  const handleRulesClose = useCallback(() => {
    setRulesTarget(null);
  }, []);
  const renderMarket = useCallback(
    (market: PredictMarket) => (
      <MarketStandardCard
        market={market}
        onRulesPress={handleMarketRulesPress}
      />
    ),
    [handleMarketRulesPress],
  );

  if (query.data) {
    const eventRules = query.data.rules?.trim();
    const selectedMarket =
      rulesTarget?.type === 'market'
        ? query.data.markets.find(
            (market) => market.id === rulesTarget.marketId,
          )
        : undefined;

    return (
      <>
        <EventScreenChrome onBack={handleBack}>
          <MarketList
            markets={query.data.markets}
            renderItem={renderMarket}
            contentContainerStyle={listContentContainerStyle}
            ListHeaderComponent={
              <EventDetailHeader
                event={query.data}
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
          market={selectedMarket}
          settlementSources={query.data.settlementSources}
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
