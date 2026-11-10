import React, { createContext, useContext, useMemo } from 'react';
import { Pressable as NativePressable } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import type {
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import {
  getMatchupSlot,
  shouldMirrorTeamLogo,
  useGameTeamColors,
} from '../../game';
import { TeamLogo as SharedTeamLogo } from '../../shared/ui';
import { EventCard } from './EventCard';
import {
  createGameCardProjection,
  type GameCardProjection,
  type GameSelection,
} from './createGameCardProjection';

type OrderHandler = (
  event: PredictEvent,
  market: PredictMarket,
  outcome: PredictOutcome,
) => void;

interface GameCardContextValue {
  event: PredictEvent;
  game: PredictGame;
  projection: GameCardProjection;
  actions: {
    openEvent: () => void;
    order?: OrderHandler;
  };
  colors: Record<GameSelection, string>;
}

const GameCardContext = createContext<GameCardContextValue | undefined>(
  undefined,
);

const useGameCard = () => {
  const value = useContext(GameCardContext);
  if (!value) {
    throw new Error('GameCard parts must be rendered inside GameCard.Provider');
  }
  return value;
};

const useTeam = (selection: GameSelection) => {
  const value = useGameCard();
  return {
    ...value,
    ...value.projection.teams[selection],
    teamColor: value.colors[selection],
  };
};

interface ProviderProps {
  children: React.ReactNode;
  event: PredictEvent;
  game: PredictGame;
  onPress: () => void;
  onOrder?: OrderHandler;
}

const Provider = ({
  children,
  event,
  game,
  onPress,
  onOrder,
}: ProviderProps) => {
  const colors = useGameTeamColors(game);
  const value = useMemo<GameCardContextValue>(
    () => ({
      event,
      game,
      projection: createGameCardProjection(event, game),
      actions: { openEvent: onPress, order: onOrder },
      colors,
    }),
    [colors, event, game, onOrder, onPress],
  );

  return (
    <GameCardContext.Provider value={value}>
      {children}
    </GameCardContext.Provider>
  );
};

const TeamLogo = ({
  selection,
  size = 'small',
  flipped = false,
}: {
  selection: GameSelection;
  size?: 'small' | 'largeWide';
  flipped?: boolean;
}) => {
  const { event, team, abbreviation } = useTeam(selection);

  return (
    <SharedTeamLogo
      team={team}
      abbreviation={abbreviation}
      size={size}
      flipped={flipped}
      testID={`predict-next-game-logo-${event.id}-${selection}`}
      fallbackTestID={`predict-next-game-logo-fallback-${event.id}-${selection}`}
    />
  );
};

const StatusContent = ({ variant }: { variant: 'compact' | 'featured' }) => {
  const { event, game, projection } = useGameCard();
  const line = projection.status[variant];
  const featured = variant === 'featured';

  return (
    <Box
      twClassName={featured ? 'items-center gap-1' : 'flex-row gap-2 pb-1'}
      testID={`predict-next-game-status-${event.id}`}
    >
      <Box
        twClassName={`flex-row items-center ${featured ? 'gap-1' : 'gap-2'}`}
      >
        {game.status === 'in_progress' ? (
          <Box
            testID={`predict-next-game-live-dot-${event.id}`}
            twClassName={`${featured ? 'h-2 w-2' : 'h-2.5 w-2.5'} rounded-full bg-success-default`}
          />
        ) : null}
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Bold}
          color={
            game.status === 'in_progress'
              ? TextColor.SuccessDefault
              : featured && game.status === 'scheduled'
                ? TextColor.TextDefault
                : TextColor.TextAlternative
          }
        >
          {line.label}
        </Text>
      </Box>
      {line.metadata ? (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextAlternative}
        >
          {line.metadata}
        </Text>
      ) : null}
    </Box>
  );
};

const CompactStatus = () => <StatusContent variant="compact" />;
const FeaturedStatus = () => <StatusContent variant="featured" />;

const CompactTeamRow = ({ selection }: { selection: GameSelection }) => {
  const { event, game, team, percent, multiplier, teamColor } =
    useTeam(selection);
  const score = game.score?.[selection];
  const color = teamColor;

  return (
    <Box
      twClassName="flex-row items-center gap-3"
      testID={`predict-next-game-team-${event.id}-${selection}`}
    >
      <TeamLogo selection={selection} />
      <Box twClassName="min-w-0 flex-1 gap-2">
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
        >
          {team.name}
        </Text>
        {percent !== undefined ? (
          <Box twClassName="h-0.5 overflow-hidden rounded-full bg-muted">
            <Box
              twClassName="h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: color }}
            />
          </Box>
        ) : null}
      </Box>
      {game.status === 'scheduled' && multiplier ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="w-12 text-right"
        >
          {multiplier}
        </Text>
      ) : score !== undefined ? (
        <Box twClassName="h-8 w-8 items-center justify-center rounded-lg border border-muted p-1">
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}>
            {score}
          </Text>
        </Box>
      ) : (
        <Box twClassName="w-8" />
      )}
    </Box>
  );
};

// The design labels a Team "ABBR · record"; the Team has no win-loss record
// yet, so the label is the abbreviation alone.
const FeaturedTeam = ({ selection }: { selection: GameSelection }) => {
  const { event, team, abbreviation, projection } = useTeam(selection);
  const slot = getMatchupSlot(projection.teamOrder, selection);

  return (
    <Box twClassName="w-[52px] items-center gap-1">
      <TeamLogo
        selection={selection}
        size="largeWide"
        flipped={shouldMirrorTeamLogo(team, slot)}
      />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="text-center"
        testID={`predict-next-game-team-label-${event.id}-${selection}`}
      >
        {abbreviation}
      </Text>
    </Box>
  );
};

const Score = ({ selection }: { selection: GameSelection }) => {
  const { game } = useGameCard();
  return game.score ? (
    <Text
      variant={TextVariant.DisplayMd}
      fontWeight={FontWeight.Bold}
      twClassName="min-w-0 flex-1 text-center"
    >
      {game.score[selection]}
    </Text>
  ) : null;
};

const Matchup = ({ children }: { children: React.ReactNode }) => {
  const { event } = useGameCard();
  return (
    <Box
      twClassName="flex-row items-center justify-between px-4 pb-2.5 pt-5"
      testID={`predict-next-game-matchup-${event.id}`}
    >
      {children}
    </Box>
  );
};

/**
 * Two rounded segments sized by the Teams' share of the two prices. The
 * first Team's segment is neutral and the second takes its Team color, like
 * the featured quote buttons.
 */
const ProbabilityBar = () => {
  const { colors: themeColors } = useTheme();
  const { event, projection, colors } = useGameCard();
  const firstShare = projection.firstTeamProbabilityPercent;
  const [first, second] = projection.teamOrder;

  if (firstShare === undefined) {
    return null;
  }

  return (
    <Box
      testID={`predict-next-game-bar-${event.id}`}
      twClassName="flex-row gap-1 px-4"
    >
      <Box
        testID={`predict-next-game-bar-${event.id}-${first}`}
        twClassName="h-1 rounded-full"
        style={{
          flex: firstShare,
          backgroundColor: themeColors.text.default,
        }}
      />
      <Box
        testID={`predict-next-game-bar-${event.id}-${second}`}
        twClassName="h-1 rounded-full"
        style={{
          flex: 100 - firstShare,
          backgroundColor: colors[second],
        }}
      />
    </Box>
  );
};

const Quote = ({ selection }: { selection: GameSelection }) => {
  const { colors: themeColors } = useTheme();
  const {
    event,
    team,
    quote,
    abbreviation,
    formattedPrice,
    canOrder,
    actions,
    teamColor,
  } = useTeam(selection);

  if (!quote) {
    return null;
  }

  const label = formattedPrice
    ? `${abbreviation} · ${formattedPrice}`
    : abbreviation;
  const testID = `predict-next-game-quote-${event.id}-${selection}`;

  if (!formattedPrice) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Secondary}
        accessibilityLabel={`${team.name}, price unavailable`}
        size={ButtonSize.Lg}
        twClassName="w-full px-3"
        isDisabled
      >
        {label}
      </Button>
    );
  }

  // Without an order handler (the Venue does not support buy) the price is
  // shown, never offered as a button.
  if (!canOrder || !actions.order) {
    return (
      <Box
        testID={testID}
        twClassName="min-w-20 items-center rounded-lg px-3 py-2"
        accessible
        accessibilityLabel={`${team.name}, ${formattedPrice}`}
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {label}
        </Text>
      </Box>
    );
  }

  return (
    <Button
      testID={testID}
      variant={ButtonVariant.Secondary}
      onPress={() => actions.order?.(event, quote.market, quote.outcome)}
      accessibilityLabel={`${team.name}, ${formattedPrice}, buy`}
      style={{ backgroundColor: teamColor }}
      size={ButtonSize.Lg}
      twClassName="w-full px-3"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        style={{ color: themeColors.overlay.inverse }}
      >
        {label}
      </Text>
    </Button>
  );
};

const Actions = () => {
  const { projection } = useGameCard();
  const selections = projection.teamOrder.filter(
    (selection) => projection.teams[selection].quote,
  );

  return selections.length ? (
    <EventCard.Actions>
      {selections.map((selection) => (
        <EventCard.Action key={selection}>
          <Quote selection={selection} />
        </EventCard.Action>
      ))}
    </EventCard.Actions>
  ) : null;
};

/**
 * "Team name · price" on one line. A long name truncates so the price always
 * shows.
 */
const QuoteLabel = ({
  name,
  price,
  color = TextColor.TextDefault,
  textColor,
}: {
  name: string;
  price: string;
  color?: TextColor;
  /** A raw color for text on a Team color fill. */
  textColor?: string;
}) => {
  const style = textColor ? { color: textColor } : undefined;
  return (
    <Box twClassName="min-w-0 shrink flex-row items-center gap-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={color}
        numberOfLines={1}
        twClassName="shrink"
        style={style}
      >
        {name}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={color}
        twClassName="shrink-0"
        style={style}
      >
        {strings('predict_next.event.game_quote_price', { price })}
      </Text>
    </Box>
  );
};

/**
 * A featured quote: a 48px pill labelled "Team name · price". The first Team
 * in the card's order gets the neutral primary pill, the second its Team
 * color.
 */
const FeaturedQuote = ({ selection }: { selection: GameSelection }) => {
  const { colors: themeColors } = useTheme();
  const {
    event,
    team,
    quote,
    formattedPrice,
    canOrder,
    actions,
    teamColor,
    projection,
  } = useTeam(selection);

  if (!quote) {
    return null;
  }

  const testID = `predict-next-game-quote-${event.id}-${selection}`;

  if (!formattedPrice) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Secondary}
        accessibilityLabel={strings(
          'predict_next.event.game_quote_price_unavailable_accessibility_label',
          { team: team.name },
        )}
        size={ButtonSize.Lg}
        twClassName="w-full px-3"
        isDisabled
      >
        {team.name}
      </Button>
    );
  }

  // Without an order handler (the Venue does not support buy) the price is
  // shown, never offered as a button.
  if (!canOrder || !actions.order) {
    return (
      <Box
        testID={testID}
        twClassName="h-12 items-center justify-center px-3"
        accessible
        accessibilityLabel={strings(
          'predict_next.event.game_quote_price_accessibility_label',
          { team: team.name, price: formattedPrice },
        )}
      >
        <QuoteLabel name={team.name} price={formattedPrice} />
      </Box>
    );
  }

  const onPress = () => actions.order?.(event, quote.market, quote.outcome);
  const accessibilityLabel = strings(
    'predict_next.event.game_quote_buy_accessibility_label',
    { team: team.name, price: formattedPrice },
  );

  if (projection.teamOrder[0] === selection) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Primary}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        size={ButtonSize.Lg}
        twClassName="w-full px-3"
      >
        <QuoteLabel
          name={team.name}
          price={formattedPrice}
          color={TextColor.PrimaryInverse}
        />
      </Button>
    );
  }

  return (
    <Button
      testID={testID}
      variant={ButtonVariant.Primary}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={{ backgroundColor: teamColor }}
      size={ButtonSize.Lg}
      twClassName="w-full px-3"
    >
      <QuoteLabel
        name={team.name}
        price={formattedPrice}
        textColor={themeColors.overlay.inverse}
      />
    </Button>
  );
};

const FeaturedActions = () => {
  const { projection } = useGameCard();
  const selections = projection.teamOrder.filter(
    (selection) => projection.teams[selection].quote,
  );

  return selections.length ? (
    <Box twClassName="flex-row gap-2 px-4 pt-4">
      {selections.map((selection) => (
        <EventCard.Action key={selection}>
          <FeaturedQuote selection={selection} />
        </EventCard.Action>
      ))}
    </Box>
  ) : null;
};

const Footer = ({ children }: { children: React.ReactNode }) => {
  const { event, projection } = useGameCard();

  if (
    !event.sports?.competition?.label &&
    !event.volume &&
    !projection.hiddenMarketCount
  ) {
    return null;
  }

  return (
    <EventCard.Body twClassName="pt-3">
      <EventCard.Footer testID={`predict-next-game-${event.id}-footer`}>
        {children}
      </EventCard.Footer>
    </EventCard.Body>
  );
};

const Competition = () => {
  const { event } = useGameCard();
  const competition = event.sports?.competition?.label;
  return competition ? (
    <EventCard.MetadataTag testID={`predict-next-game-${event.id}-competition`}>
      {competition}
    </EventCard.MetadataTag>
  ) : null;
};

const MoreMarkets = () => {
  const { event, projection, actions } = useGameCard();

  return (
    <EventCard.MoreMarkets
      count={projection.hiddenMarketCount}
      onPress={actions.openEvent}
      testID={`predict-next-event-more-${event.id}`}
    />
  );
};

const Navigation = ({ children }: { children: React.ReactNode }) => {
  const { event, actions } = useGameCard();
  return (
    <NativePressable
      onPress={actions.openEvent}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      testID={`predict-next-event-content-${event.venueId}-${event.id}`}
    >
      {children}
    </NativePressable>
  );
};

export const GameCard = {
  Provider,
  Navigation,
  CompactStatus,
  FeaturedStatus,
  CompactTeamRow,
  FeaturedTeam,
  Score,
  Matchup,
  ProbabilityBar,
  Actions,
  FeaturedActions,
  Footer,
  Competition,
  MoreMarkets,
};
