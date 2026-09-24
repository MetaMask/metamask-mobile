import React from 'react';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { getEventGame } from '../game';
import { EventCardGame, type EventCardGameVariant } from './EventCardGame';
import { EventCardStandard } from './EventCardStandard';

export interface PredictEventCardProps {
  event: PredictEvent;
  variant?: EventCardGameVariant;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

export const PredictEventCard = ({
  event,
  variant,
  onPress,
  onOrder,
}: PredictEventCardProps) =>
  getEventGame(event) ? (
    <EventCardGame
      event={event}
      variant={variant}
      onPress={onPress}
      onOrder={onOrder}
    />
  ) : (
    <EventCardStandard event={event} onPress={onPress} onOrder={onOrder} />
  );
