import React from 'react';
import { EventCardGame } from './EventCardGame';
import {
  EventCardStandard,
  type EventCardStandardProps,
} from './EventCardStandard';
import { resolveEventCardKind } from './resolveEventCardKind';

export type EventListCardProps = EventCardStandardProps;

/** Renders the Event card composition owned by a Feed or Event list. */
export const EventListCard = ({
  event,
  onPress,
  onOrder,
}: EventListCardProps) =>
  resolveEventCardKind(event) === 'game' ? (
    <EventCardGame event={event} onPress={onPress} onOrder={onOrder} />
  ) : (
    <EventCardStandard event={event} onPress={onPress} onOrder={onOrder} />
  );
