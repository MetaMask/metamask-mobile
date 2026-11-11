import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictOutcome,
} from '../../types';
import { formatGameStartShort, getGameTeamOrder } from '../game';
import { EventCard } from './internal/EventCard';
import { GameCard } from './internal/EventCardGameParts';

export type EventCardGameVariant = 'compact' | 'featured' | 'small';

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
}: GameCompositionProps) => {
  const [first, second] = getGameTeamOrder(game);

  return (
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
            <GameCard.CompactTeamRow selection={first} />
            <GameCard.CompactTeamRow selection={second} />
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
};

const FeaturedGameCard = ({
  event,
  game,
  onPress,
  onOrder,
}: GameCompositionProps) => {
  const [first, second] = getGameTeamOrder(game);
  const competition = event.sports?.competition?.label;

  return (
    <GameCard.Provider
      event={event}
      game={game}
      onPress={onPress}
      onOrder={onOrder}
    >
      <EventCard.Root
        twClassName="rounded-2xl bg-section py-4"
        testID={`predict-next-event-${event.venueId}-${event.id}`}
      >
        <GameCard.Navigation>
          <EventCard.HeaderRow testID={`predict-next-game-header-${event.id}`}>
            <EventCard.HeaderRow.Title>{event.title}</EventCard.HeaderRow.Title>
            {competition ? (
              <EventCard.HeaderRow.Meta
                testID={`predict-next-game-header-${event.id}-competition`}
              >
                {competition}
              </EventCard.HeaderRow.Meta>
            ) : null}
          </EventCard.HeaderRow>
          <GameCard.Matchup>
            <GameCard.FeaturedTeam selection={first} />
            <GameCard.Score selection={first} />
            <GameCard.FeaturedStatus />
            <GameCard.Score selection={second} />
            <GameCard.FeaturedTeam selection={second} />
          </GameCard.Matchup>
          <GameCard.ProbabilityBar />
        </GameCard.Navigation>

        <GameCard.FeaturedActions />
      </EventCard.Root>
    </GameCard.Provider>
  );
};

/**
 * A 190pt tile for horizontal rows: Competition and start in the header, then
 * one row per Team with its logo, abbreviation and price pill. The header and
 * Team identities open the Event; a priced pill opens the order flow.
 */
const SmallGameCard = ({
  event,
  game,
  onPress,
  onOrder,
}: GameCompositionProps) => {
  const [first, second] = getGameTeamOrder(game);
  const competition = event.sports?.competition?.label;
  const start = event.startsAt
    ? formatGameStartShort(event.startsAt)
    : undefined;

  return (
    <GameCard.Provider
      event={event}
      game={game}
      onPress={onPress}
      onOrder={onOrder}
    >
      <EventCard.Root
        twClassName="w-[190px] rounded-2xl border border-muted bg-muted py-3"
        testID={`predict-next-event-${event.venueId}-${event.id}`}
      >
        <GameCard.Navigation>
          <EventCard.HeaderRow testID={`predict-next-game-header-${event.id}`}>
            {/* Always rendered, so the start stays right without a Competition. */}
            <Box
              twClassName="min-w-0 flex-1"
              testID={`predict-next-game-header-${event.id}-leading`}
            >
              {competition ? (
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                  testID={`predict-next-game-header-${event.id}-competition`}
                >
                  {competition}
                </Text>
              ) : null}
            </Box>
            {start ? (
              <EventCard.HeaderRow.Meta
                testID={`predict-next-game-header-${event.id}-start`}
              >
                {start}
              </EventCard.HeaderRow.Meta>
            ) : null}
          </EventCard.HeaderRow>
        </GameCard.Navigation>
        <EventCard.Body twClassName="gap-2 px-4 pt-2">
          <GameCard.SmallTeamRow selection={first} />
          <GameCard.SmallTeamRow selection={second} />
        </EventCard.Body>
      </EventCard.Root>
    </GameCard.Provider>
  );
};

const COMPOSITIONS: Record<
  EventCardGameVariant,
  (props: GameCompositionProps) => React.JSX.Element
> = {
  compact: CompactGameCard,
  featured: FeaturedGameCard,
  small: SmallGameCard,
};

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

  const Composition = COMPOSITIONS[variant];
  return (
    <Composition
      event={event}
      game={game}
      onPress={onPress}
      onOrder={onOrder}
    />
  );
};
