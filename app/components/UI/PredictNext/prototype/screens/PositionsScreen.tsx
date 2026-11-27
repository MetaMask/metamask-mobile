import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { formatUsd, getProtoEvent } from '../fixtures';
import { GlassHeader, PositionCard } from '../components';
import { useOpenEvent, useProtoNavigation } from '../navigation';
import { usePrototypeState } from '../PrototypeState';
import { PositionsEmpty } from './GameEventScreen';

export const PositionsScreen = () => {
  const tw = useTailwind();
  const navigation = useProtoNavigation();
  const openEvent = useOpenEvent();
  const state = usePrototypeState();
  const totalValue = state.positions.reduce(
    (sum, position) => sum + (position.contracts * position.currentPrice) / 100,
    0,
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <GlassHeader title="Positions" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={tw.style('px-4 pb-16 gap-3')}>
        <Box twClassName="pb-2">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Positions value
          </Text>
          <Text variant={TextVariant.DisplayMd}>{formatUsd(totalValue)}</Text>
        </Box>
        {state.positions.length === 0 ? <PositionsEmpty /> : null}
        {state.positions.map((position) => (
          <Box key={position.id} twClassName="gap-2">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              onPress={() => {
                const event = getProtoEvent(position.eventId);
                if (event) openEvent(event);
              }}
            >
              {`${position.eventTitle} ›`}
            </Text>
            <PositionCard
              position={position}
              onBuyMore={() =>
                state.openOrder({
                  eventId: position.eventId,
                  eventTitle: position.eventTitle,
                  marketTitle: position.marketTitle,
                  selected: {
                    outcomeId: position.outcomeId,
                    label: position.label,
                    price: position.currentPrice,
                    color: position.color,
                    avatar: position.avatar,
                  },
                })
              }
              onCashOut={() => state.openCashOut(position)}
            />
          </Box>
        ))}
      </ScrollView>
    </Box>
  );
};
