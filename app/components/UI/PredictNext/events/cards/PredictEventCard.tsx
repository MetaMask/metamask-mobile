import React from 'react';
import type { PredictEvent } from '../../types';
import { getEventGame } from '../game';
import { EventCardGame } from './EventCardGame';
import { EventCardStandard } from './EventCardStandard';

export interface PredictEventCardProps {
  event: PredictEvent;
  onPress: () => void;
}

export const PredictEventCard = ({ event, onPress }: PredictEventCardProps) =>
  getEventGame(event) ? (
    <EventCardGame event={event} onPress={onPress} />
  ) : (
    <EventCardStandard event={event} onPress={onPress} />
  );
