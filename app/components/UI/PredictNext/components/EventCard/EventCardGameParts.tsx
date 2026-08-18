import React, { createContext, useContext, useMemo, useState } from 'react';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Image as ExpoImage } from 'expo-image';
import BigNumber from 'bignumber.js';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { useTheme } from '../../../../../util/theme';
import type {
  PredictEntityId,
  PredictEvent,
  PredictGame,
  PredictGameStatus,
  PredictMarket,
  PredictOutcome,
  PredictTeam,
} from '../../types';
import { EventCard } from './EventCard';
import { formatAskPrice } from './formatAskPrice';
import { formatMultiplier } from './formatMultiplier';
import { getAskPricePercent } from './getAskPricePercent';
import { parsePredictDecimal } from './parsePredictDecimal';

type GameSelection = 'away' | 'home';

type OrderHandler = (
  event: PredictEvent,
  market: PredictMarket,
  outcome: PredictOutcome,
) => void;

interface TeamQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

interface StatusLine {
  label: string;
  metadata: string;
}

interface GameCardContextValue {
  event: PredictEvent;
  game: PredictGame;
  quotes: Record<GameSelection, TeamQuote | undefined>;
  statusLines: Record<'compact' | 'featured', StatusLine>;
  representedMarketIds: ReadonlySet<PredictEntityId>;
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
    team: selection === 'away' ? value.game.awayTeam : value.game.homeTeam,
    quote: value.quotes[selection],
    fallbackColor: value.colors[selection],
  };
};

const STATUS_KEYS: Record<PredictGameStatus, string> = {
  scheduled: 'scheduled',
  in_progress: 'live',
  delayed: 'delayed',
  suspended: 'suspended',
  postponed: 'postponed',
  completed: 'final',
  canceled: 'canceled',
};

const getDisplayAbbreviation = (team: PredictTeam) =>
  (team.abbreviation ?? team.name.slice(0, 3)).toUpperCase();

const getTeamQuote = (
  event: PredictEvent,
  selection: GameSelection,
): TeamQuote | undefined => {
  const matches = event.markets.flatMap((market) =>
    market.outcomes
      .filter((outcome) => outcome.gameSelection === selection)
      .map((outcome) => ({ market, outcome })),
  );

  return matches.length === 1 ? matches[0] : undefined;
};

const getStatusLabel = (status: PredictGameStatus) =>
  strings(`predict.game_status.${STATUS_KEYS[status]}`);

const getStatusLine = (
  game: PredictGame,
  startsAt: string | undefined,
  variant: 'compact' | 'featured',
): StatusLine => {
  if (game.status === 'scheduled') {
    if (!startsAt) {
      return { label: getStatusLabel(game.status), metadata: '' };
    }

    const date = new Date(startsAt);
    if (variant === 'featured') {
      return {
        label: getIntlDateTimeFormatter(I18n.locale, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(date),
        metadata: getIntlDateTimeFormatter(I18n.locale, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(date),
      };
    }

    const day = getIntlDateTimeFormatter(I18n.locale, {
      month: 'long',
      day: 'numeric',
    }).format(date);
    const time = getIntlDateTimeFormatter(I18n.locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
    return { label: `${day} · ${time}`, metadata: '' };
  }

  const metadata = ['in_progress', 'delayed', 'suspended'].includes(game.status)
    ? [game.period, game.clock].filter(Boolean).join(' · ')
    : '';

  return { label: getStatusLabel(game.status), metadata };
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
  const { colors } = useTheme();
  const value = useMemo<GameCardContextValue>(() => {
    const quotes = {
      away: getTeamQuote(event, 'away'),
      home: getTeamQuote(event, 'home'),
    };
    const representedMarketIds = new Set<PredictEntityId>();

    for (const quote of Object.values(quotes)) {
      if (quote && formatAskPrice(quote.outcome.askPrice)) {
        representedMarketIds.add(quote.market.id);
      }
    }

    return {
      event,
      game,
      quotes,
      representedMarketIds,
      statusLines: {
        compact: getStatusLine(game, event.startsAt, 'compact'),
        featured: getStatusLine(game, event.startsAt, 'featured'),
      },
      actions: { openEvent: onPress, order: onOrder },
      colors: {
        away: colors.info.default,
        home: colors.success.default,
      },
    };
  }, [
    colors.info.default,
    colors.success.default,
    event,
    game,
    onOrder,
    onPress,
  ]);

  return (
    <GameCardContext.Provider value={value}>
      {children}
    </GameCardContext.Provider>
  );
};

const TeamLogo = ({
  selection,
  size = 'small',
}: {
  selection: GameSelection;
  size?: 'small' | 'large';
}) => {
  const { event, team } = useTeam(selection);
  const tw = useTailwind();
  const [failed, setFailed] = useState(false);
  const showImage = team.logoUrl && !failed;
  const sizeClassName = size === 'large' ? 'h-10 w-10' : 'h-8 w-8';
  const imageSizeClassName = size === 'large' ? 'h-12 w-12' : 'h-9 w-9';

  return (
    <Box
      twClassName={`${sizeClassName} items-center justify-center overflow-hidden rounded-full bg-muted`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <ExpoImage
          source={team.logoUrl}
          style={tw.style(imageSizeClassName)}
          contentFit="contain"
          recyclingKey={team.logoUrl}
          onError={() => setFailed(true)}
          testID={`predict-next-game-logo-${event.id}-${selection}`}
        />
      ) : (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          testID={`predict-next-game-logo-fallback-${event.id}-${selection}`}
        >
          {getDisplayAbbreviation(team)}
        </Text>
      )}
    </Box>
  );
};

const StatusContent = ({ variant }: { variant: 'compact' | 'featured' }) => {
  const { event, game, statusLines } = useGameCard();
  const line = statusLines[variant];
  const featured = variant === 'featured';

  return (
    <Box
      twClassName={`${featured ? 'items-center' : 'flex-row pb-1'} gap-2`}
      testID={`predict-next-game-status-${event.id}`}
    >
      <Box twClassName="flex-row items-center gap-2">
        {game.status === 'in_progress' ? (
          <Box twClassName="h-2.5 w-2.5 rounded-full bg-success-default" />
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
  const { event, game, team, quote, fallbackColor } = useTeam(selection);
  const score = game.score?.[selection];
  const percent = getAskPricePercent(quote?.outcome.askPrice);
  const multiplier = formatMultiplier(quote?.outcome.askPrice);
  const color = team.primaryColor ?? fallbackColor;

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

const FeaturedTeam = ({ selection }: { selection: GameSelection }) => {
  const { team } = useTeam(selection);

  return (
    <Box twClassName="w-14 items-center gap-1">
      <TeamLogo selection={selection} size="large" />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="w-20 text-center"
      >
        {team.name}
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
      twClassName="h-20 flex-row items-center justify-between pb-4"
      testID={`predict-next-game-matchup-${event.id}`}
    >
      {children}
    </Box>
  );
};

const ProbabilityBar = () => {
  const { event, game, quotes, colors } = useGameCard();
  const away = parsePredictDecimal(quotes.away?.outcome.askPrice);
  const home = parsePredictDecimal(quotes.home?.outcome.askPrice);

  if (!away || !home) {
    return null;
  }

  const total = away.plus(home);
  if (total.lte(0)) {
    return null;
  }

  const awayWidth = away.div(total).times(new BigNumber(100)).toNumber();

  return (
    <Box
      testID={`predict-next-game-bar-${event.id}`}
      twClassName="h-0.5 flex-row overflow-hidden rounded-full"
    >
      <Box
        testID={`predict-next-game-bar-${event.id}-away`}
        style={{
          width: `${awayWidth}%`,
          backgroundColor: game.awayTeam.primaryColor ?? colors.away,
        }}
      />
      <Box
        testID={`predict-next-game-bar-${event.id}-home`}
        twClassName="flex-1"
        style={{
          backgroundColor: game.homeTeam.primaryColor ?? colors.home,
        }}
      />
    </Box>
  );
};

const Quote = ({ selection }: { selection: GameSelection }) => {
  const { colors: themeColors } = useTheme();
  const { event, team, quote, actions, fallbackColor } = useTeam(selection);
  const formattedPrice = formatAskPrice(quote?.outcome.askPrice);

  if (!quote) {
    return null;
  }

  const abbreviation = getDisplayAbbreviation(team);
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
        disabled
      >
        {label}
      </Button>
    );
  }

  if (quote.market.status !== 'active') {
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
      style={{ backgroundColor: team.primaryColor ?? fallbackColor }}
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
  const { quotes } = useGameCard();
  const selections = (['away', 'home'] as const).filter(
    (selection) => quotes[selection],
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

const Footer = ({ children }: { children: React.ReactNode }) => {
  const { event, representedMarketIds } = useGameCard();
  const hiddenCount = event.markets.filter(
    (market) => !representedMarketIds.has(market.id),
  ).length;

  if (!event.sports?.competition?.label && !event.volume && !hiddenCount) {
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
  const { event, representedMarketIds, actions } = useGameCard();
  const count = event.markets.filter(
    (market) => !representedMarketIds.has(market.id),
  ).length;

  return (
    <EventCard.MoreMarkets
      count={count}
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
  Footer,
  Competition,
  MoreMarkets,
};
