import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PredictNextStackParamList } from '../../navigation/types';
import { PredictNextRoutes } from '../../navigation/routes';
import { useEventDetail } from '../../hooks/useEventDetail';
import { PredictMarketHistory } from '../../components/PredictMarketHistory';
import { PredictEventDetailTestIds } from './PredictEventDetail.testIds';

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
  },
  marketFilter: {
    height: 'auto',
    minHeight: 32,
    maxWidth: 240,
    paddingVertical: 8,
  },
});

export const PredictEventDetail = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, eventId, title } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEventDetail'>>()
      .params;
  const eventQuery = useEventDetail(venueId, eventId);
  const [selectedMarketId, setSelectedMarketId] = useState<string>();
  const event = eventQuery.data;
  const selectedMarket =
    event?.markets.find((market) => market.id === selectedMarketId) ??
    event?.markets[0];
  const handleBack = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate(PredictNextRoutes.HOME);

  return (
    <Box twClassName="flex-1 pt-12" testID={PredictEventDetailTestIds.VIEW}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          testID={PredictEventDetailTestIds.BACK}
          variant={ButtonVariant.Tertiary}
          onPress={handleBack}
        >
          Back
        </Button>
        <Text variant={TextVariant.HeadingLg}>{event?.title ?? title}</Text>

        {eventQuery.isLoading && !event ? (
          <Box
            accessible
            accessibilityLabel="Loading Event details"
            testID={PredictEventDetailTestIds.LOADING}
            twClassName="h-32 rounded-2xl bg-muted"
          />
        ) : (eventQuery.isError && !event) || !event ? (
          <Box
            testID={PredictEventDetailTestIds.ERROR}
            twClassName="items-center gap-4 rounded-2xl bg-muted p-8"
          >
            <Text>Prediction details could not be loaded.</Text>
            <Button onPress={() => eventQuery.refetch()}>Retry</Button>
          </Box>
        ) : (
          <Box twClassName="gap-6">
            {event.markets.length > 1 ? (
              <FilterButtonGroup
                value={selectedMarket?.id ?? ''}
                onChange={setSelectedMarketId}
                variant={FilterButtonVariant.Secondary}
                testID={PredictEventDetailTestIds.MARKETS}
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
                    testID={PredictEventDetailTestIds.market(market.id)}
                  >
                    {market.question}
                  </FilterButton>
                ))}
              </FilterButtonGroup>
            ) : null}
            {selectedMarket ? (
              <PredictMarketHistory
                venueId={event.venueId}
                market={selectedMarket}
              />
            ) : null}
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};
