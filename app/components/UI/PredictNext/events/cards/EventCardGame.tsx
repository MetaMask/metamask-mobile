import React from 'react';
import type {
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictOutcome,
} from '../../types';
import { EventCard } from './internal/EventCard';
import { GameCard } from './internal/EventCardGameParts';

export type EventCardGameVariant = 'compact' | 'featured';

export interface EventCardGameProps {
  event: PredictEvent;
  variant?: EventCardGameVariant;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

interface GameCompositionProps extends EventCardGameProps {
  game: PredictGame;
}

const CompactGameCard = ({
  event,
  game,
  onPress,
  onOrder,
}: GameCompositionProps) => (
  <GameCard.Provider
    event={event}
    game={game}
    onPress={onPress}
    onOrder={onOrder}
  >
    <EventCard.Root
      twClassName="rounded-2xl bg-section px-4 pb-4 pt-3"
      testID={`predict-next-event-${event.venueId}-${event.id}`}
    >
      <GameCard.Navigation>
        <GameCard.CompactStatus />
        <EventCard.Body twClassName="gap-3 py-3">
          <GameCard.CompactTeamRow selection="away" />
          <GameCard.CompactTeamRow selection="home" />
        </EventCard.Body>
      </GameCard.Navigation>

      <GameCard.Actions />

      <GameCard.Footer>
        <EventCard.FooterLeading>
          <GameCard.Competition />
          <EventCard.Volume value={event.volume} />
        </EventCard.FooterLeading>
        <GameCard.MoreMarkets />
      </GameCard.Footer>
    </EventCard.Root>
  </GameCard.Provider>
);

const FeaturedGameCard = ({
  event,
  game,
  onPress,
  onOrder,
}: GameCompositionProps) => (
  <GameCard.Provider
    event={event}
    game={game}
    onPress={onPress}
    onOrder={onOrder}
  >
    <EventCard.Root
      twClassName="rounded-2xl bg-section px-4 pb-4 pt-4"
      testID={`predict-next-event-${event.venueId}-${event.id}`}
    >
      <GameCard.Navigation>
        <EventCard.Header twClassName="items-center pb-1">
          <EventCard.Title numberOfLines={1} twClassName="w-68 text-center">
            {event.title}
          </EventCard.Title>
        </EventCard.Header>
        <GameCard.Matchup>
          <GameCard.FeaturedTeam selection="away" />
          <GameCard.Score selection="away" />
          <GameCard.FeaturedStatus />
          <GameCard.Score selection="home" />
          <GameCard.FeaturedTeam selection="home" />
        </GameCard.Matchup>
        <EventCard.Body twClassName="pb-2">
          <GameCard.ProbabilityBar />
        </EventCard.Body>
      </GameCard.Navigation>

      <GameCard.Actions />
    </EventCard.Root>
  </GameCard.Provider>
);

export const EventCardGame = ({
  event,
  variant = 'compact',
  onPress,
  onOrder,
}: EventCardGameProps) => {
  const game = event.sports?.game;
  if (!game) {
    return null;
  }

  const props = { event, game, onPress, onOrder };
  return variant === 'featured' ? (
    <FeaturedGameCard {...props} />
  ) : (
    <CompactGameCard {...props} />
  );
};
