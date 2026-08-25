import React, { useCallback, useEffect, useState } from 'react';
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
import type { PredictMarket } from '../../types';
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
  const [rulesTarget, setRulesTarget] = useState<RulesTarget>(null);
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
  const handleRulesClose = useCallback(() => {
    setRulesTarget(null);
  }, []);

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
        <EventScreenLayout onBack={handleBack}>
          {getEventGame(query.data) ? (
            <GameEventHeader
              event={query.data}
              onRulesPress={eventRules ? handleEventRulesPress : undefined}
            />
          ) : (
            <StandardEventHeader
              event={query.data}
              onRulesPress={eventRules ? handleEventRulesPress : undefined}
            />
          )}
          <Box
            testID={PredictEventScreenTestIds.PREDICT_SECTION}
            twClassName="mt-8 gap-[14px]"
          >
            <Text variant={TextVariant.HeadingMd}>
              {strings('wallet.predict')}
            </Text>
            <MarketList>
              {query.data.markets.map((market) => (
                <MarketStandardCard
                  key={market.id}
                  market={market}
                  onRulesPress={handleMarketRulesPress}
                />
              ))}
            </MarketList>
          </Box>
        </EventScreenLayout>
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
