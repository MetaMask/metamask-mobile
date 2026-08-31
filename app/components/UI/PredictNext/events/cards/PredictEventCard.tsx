import React from 'react';
import type { PredictEvent } from '../../types';
import { EventCardGame } from './EventCardGame';
import { EventCardStandard } from './EventCardStandard';

export interface PredictEventCardProps {
  event: PredictEvent;
  onPress: () => void;
}

const isAmericanFootballGameEvent = (event: PredictEvent): boolean =>
  event.sports?.sport.id === 'american-football' && Boolean(event.sports.game);

export const PredictEventCard = ({ event, onPress }: PredictEventCardProps) =>
  isAmericanFootballGameEvent(event) ? (
    <EventCardGame event={event} onPress={onPress} />
  ) : (
    <EventCardStandard event={event} onPress={onPress} />
  );
