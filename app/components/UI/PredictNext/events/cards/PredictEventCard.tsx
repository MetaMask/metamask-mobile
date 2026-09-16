import React from 'react';
import type { PredictEvent } from '../../types';
import { getEventGame } from '../game';
import { EventCardGame, type EventCardGameVariant } from './EventCardGame';
import { EventCardStandard } from './EventCardStandard';

export interface PredictEventCardProps {
  event: PredictEvent;
  variant?: EventCardGameVariant;
  onPress: () => void;
}

export const PredictEventCard = ({
  event,
  variant,
  onPress,
}: PredictEventCardProps) =>
  getEventGame(event) ? (
    <EventCardGame event={event} variant={variant} onPress={onPress} />
  ) : (
    <EventCardStandard event={event} onPress={onPress} />
  );
