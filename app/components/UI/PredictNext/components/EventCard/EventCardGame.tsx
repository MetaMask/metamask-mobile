import React, { useState } from 'react';
import { Pressable as NativePressable } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
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
  PredictGameStatus,
  PredictMarket,
  PredictOutcome,
  PredictTeam,
} from '../../types';
import { formatAskPrice } from './formatAskPrice';
import { formatMultiplier } from './formatMultiplier';
import { formatVolume } from './formatVolume';
import { getAskPricePercent } from './getAskPricePercent';
import { parsePredictDecimal } from './parsePredictDecimal';

export type EventCardGameVariant = 'compact' | 'featured';

type GameSelection = 'away' | 'home';

interface TeamQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

interface EventCardGameProps {
  event: PredictEvent;
  variant?: EventCardGameVariant;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

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

const formatScheduledTime = (startsAt?: string) => {
  if (!startsAt) {
    return undefined;
  }

  const date = new Date(startsAt);
  const day = getIntlDateTimeFormatter(I18n.locale, {
    month: 'long',
    day: 'numeric',
  }).format(date);
  const time = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${day} · ${time}`;
};

const getStatusLabel = (status: PredictGameStatus) =>
  strings(`predict.game_status.${STATUS_KEYS[status]}`);

const getStatusLine = (
  status: PredictGameStatus,
  period?: string,
  clock?: string,
  startsAt?: string,
  featured?: boolean,
) => {
  if (status === 'scheduled') {
    if (!startsAt) {
      return { label: getStatusLabel(status), metadata: '' };
    }

    const startsAtDate = new Date(startsAt);
    return featured
      ? {
          label: getIntlDateTimeFormatter(I18n.locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).format(startsAtDate),
          metadata: getIntlDateTimeFormatter(I18n.locale, {
            hour: 'numeric',
            minute: '2-digit',
          }).format(startsAtDate),
        }
      : { label: formatScheduledTime(startsAt), metadata: '' };
  }

  const metadata = ['in_progress', 'delayed', 'suspended'].includes(status)
    ? [period, clock].filter(Boolean)
    : [];

  return {
    label: getStatusLabel(status),
    metadata: metadata.join(' · '),
  };
};

const TeamLogo = ({
  eventId,
  selection,
  team,
  size = 'small',
}: {
  eventId: string;
  selection: GameSelection;
  team: PredictTeam;
  size?: 'small' | 'large';
}) => {
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
          testID={`predict-next-game-logo-${eventId}-${selection}`}
        />
      ) : (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          testID={`predict-next-game-logo-fallback-${eventId}-${selection}`}
        >
          {getDisplayAbbreviation(team)}
        </Text>
      )}
    </Box>
  );
};

const Quote = ({
  event,
  selection,
  team,
  quote,
  onOrder,
  fallbackColor,
}: {
  event: PredictEvent;
  selection: GameSelection;
  team: PredictTeam;
  quote?: TeamQuote;
  onOrder?: EventCardGameProps['onOrder'];
  fallbackColor: string;
}) => {
  const { colors } = useTheme();
  const formattedPrice = formatAskPrice(quote?.outcome.askPrice);

  if (!quote || !formattedPrice) {
    return null;
  }

  const label = `${getDisplayAbbreviation(team)} · ${formattedPrice}`;
  const testID = `predict-next-game-quote-${event.id}-${selection}`;

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
      onPress={() => onOrder?.(event, quote.market, quote.outcome)}
      accessibilityLabel={`${team.name}, ${formattedPrice}, buy`}
      style={{ backgroundColor: team.primaryColor ?? fallbackColor }}
      size={ButtonSize.Lg}
      twClassName="w-full px-3"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        style={{ color: colors.overlay.inverse }}
      >
        {label}
      </Text>
    </Button>
  );
};

const CompactTeamRow = ({
  event,
  selection,
  team,
  score,
  quote,
  fallbackColor,
  showMultiplier,
}: {
  event: PredictEvent;
  selection: GameSelection;
  team: PredictTeam;
  score?: string;
  quote?: TeamQuote;
  fallbackColor: string;
  showMultiplier: boolean;
}) => {
  const percent = getAskPricePercent(quote?.outcome.askPrice);
  const multiplier = formatMultiplier(quote?.outcome.askPrice);
  const color = team.primaryColor ?? fallbackColor;

  return (
    <Box
      twClassName="flex-row items-center gap-3"
      testID={`predict-next-game-team-${event.id}-${selection}`}
    >
      <TeamLogo eventId={event.id} selection={selection} team={team} />
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
      {showMultiplier && multiplier ? (
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

const FeaturedTeam = ({
  eventId,
  selection,
  team,
}: {
  eventId: string;
  selection: GameSelection;
  team: PredictTeam;
}) => (
  <Box twClassName="w-14 items-center gap-1">
    <TeamLogo
      eventId={eventId}
      selection={selection}
      team={team}
      size="large"
    />
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

const FeaturedBar = ({
  eventId,
  awayTeam,
  homeTeam,
  awayQuote,
  homeQuote,
  awayFallbackColor,
  homeFallbackColor,
}: {
  eventId: string;
  awayTeam: PredictTeam;
  homeTeam: PredictTeam;
  awayQuote?: TeamQuote;
  homeQuote?: TeamQuote;
  awayFallbackColor: string;
  homeFallbackColor: string;
}) => {
  const away = parsePredictDecimal(awayQuote?.outcome.askPrice);
  const home = parsePredictDecimal(homeQuote?.outcome.askPrice);

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
      testID={`predict-next-game-bar-${eventId}`}
      twClassName="h-0.5 flex-row overflow-hidden rounded-full"
    >
      <Box
        testID={`predict-next-game-bar-${eventId}-away`}
        style={{
          width: `${awayWidth}%`,
          backgroundColor: awayTeam.primaryColor ?? awayFallbackColor,
        }}
      />
      <Box
        testID={`predict-next-game-bar-${eventId}-home`}
        twClassName="flex-1"
        style={{ backgroundColor: homeTeam.primaryColor ?? homeFallbackColor }}
      />
    </Box>
  );
};

const GameStatus = ({
  eventId,
  status,
  label,
  metadata,
  featured,
}: {
  eventId: string;
  status: PredictGameStatus;
  label: string;
  metadata: string;
  featured?: boolean;
}) => (
  <Box
    twClassName={`${featured ? 'items-center' : 'flex-row pb-1'} gap-2`}
    testID={`predict-next-game-status-${eventId}`}
  >
    <Box twClassName="flex-row items-center gap-2">
      {status === 'in_progress' ? (
        <Box twClassName="h-2.5 w-2.5 rounded-full bg-success-default" />
      ) : null}
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={
          status === 'in_progress'
            ? TextColor.SuccessDefault
            : featured && status === 'scheduled'
              ? TextColor.TextDefault
              : TextColor.TextAlternative
        }
      >
        {label}
      </Text>
    </Box>
    {metadata ? (
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextAlternative}
      >
        {metadata}
      </Text>
    ) : null}
  </Box>
);

const CompactFooter = ({
  event,
  representedMarketIds,
  onPress,
}: {
  event: PredictEvent;
  representedMarketIds: ReadonlySet<PredictEntityId>;
  onPress: () => void;
}) => {
  const competition = event.sports?.competition?.label;
  const volume = formatVolume(event.volume);
  const hiddenCount = event.markets.filter(
    (market) => !representedMarketIds.has(market.id),
  ).length;

  if (!competition && !volume && hiddenCount === 0) {
    return null;
  }

  return (
    <Box
      testID={`predict-next-game-${event.id}-footer`}
      twClassName="flex-row items-center justify-between"
    >
      <Box twClassName="flex-1 flex-row items-center gap-3">
        {competition ? (
          <Tag
            severity={TagSeverity.Neutral}
            testID={`predict-next-game-${event.id}-competition`}
          >
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {competition}
            </Text>
          </Tag>
        ) : null}
        {volume ? (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            ${volume} Vol
          </Text>
        ) : null}
      </Box>
      {hiddenCount > 0 ? (
        <NativePressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`+${hiddenCount} more`}
          testID={`predict-next-event-more-${event.id}`}
        >
          <Box twClassName="flex-row items-center">
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              +{hiddenCount} more
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Xs}
              color={IconColor.IconAlternative}
            />
          </Box>
        </NativePressable>
      ) : null}
    </Box>
  );
};

export const EventCardGame = ({
  event,
  variant = 'compact',
  onPress,
  onOrder,
}: EventCardGameProps) => {
  const { colors } = useTheme();
  const game = event.sports?.game;
  if (!game) {
    return null;
  }

  const awayQuote = getTeamQuote(event, 'away');
  const homeQuote = getTeamQuote(event, 'home');
  const statusLine = getStatusLine(
    game.status,
    game.period,
    game.clock,
    event.startsAt,
    variant === 'featured',
  );
  const representedMarketIds = new Set<PredictEntityId>();
  if (awayQuote && formatAskPrice(awayQuote.outcome.askPrice)) {
    representedMarketIds.add(awayQuote.market.id);
  }
  if (homeQuote && formatAskPrice(homeQuote.outcome.askPrice)) {
    representedMarketIds.add(homeQuote.market.id);
  }

  return (
    <Box
      twClassName={`rounded-2xl bg-section px-4 pb-4 ${
        variant === 'featured' ? 'pt-4' : 'pt-3'
      }`}
      testID={`predict-next-event-${event.venueId}-${event.id}`}
    >
      <NativePressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={event.title}
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <Box>
          {variant === 'featured' ? (
            <Box twClassName="items-center pb-1">
              <Text
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Bold}
                numberOfLines={1}
                twClassName="w-68 text-center"
              >
                {event.title}
              </Text>
            </Box>
          ) : null}
          {variant === 'compact' ? (
            <>
              <GameStatus
                eventId={event.id}
                status={game.status}
                label={statusLine.label}
                metadata={statusLine.metadata}
              />
              <Box twClassName="gap-3 py-3">
                <CompactTeamRow
                  event={event}
                  selection="away"
                  team={game.awayTeam}
                  score={game.score?.away}
                  quote={awayQuote}
                  fallbackColor={colors.info.default}
                  showMultiplier={game.status === 'scheduled'}
                />
                <CompactTeamRow
                  event={event}
                  selection="home"
                  team={game.homeTeam}
                  score={game.score?.home}
                  quote={homeQuote}
                  fallbackColor={colors.success.default}
                  showMultiplier={game.status === 'scheduled'}
                />
              </Box>
            </>
          ) : (
            <Box>
              <Box
                twClassName="h-20 flex-row items-center justify-between pb-4"
                testID={`predict-next-game-matchup-${event.id}`}
              >
                <FeaturedTeam
                  eventId={event.id}
                  selection="away"
                  team={game.awayTeam}
                />
                {game.score ? (
                  <Text
                    variant={TextVariant.DisplayMd}
                    fontWeight={FontWeight.Bold}
                    twClassName="min-w-0 flex-1 text-center"
                  >
                    {game.score.away}
                  </Text>
                ) : null}
                <GameStatus
                  eventId={event.id}
                  status={game.status}
                  label={statusLine.label}
                  metadata={statusLine.metadata}
                  featured
                />
                {game.score ? (
                  <Text
                    variant={TextVariant.DisplayMd}
                    fontWeight={FontWeight.Bold}
                    twClassName="min-w-0 flex-1 text-center"
                  >
                    {game.score.home}
                  </Text>
                ) : null}
                <FeaturedTeam
                  eventId={event.id}
                  selection="home"
                  team={game.homeTeam}
                />
              </Box>
              <Box twClassName="pb-2">
                <FeaturedBar
                  eventId={event.id}
                  awayTeam={game.awayTeam}
                  homeTeam={game.homeTeam}
                  awayQuote={awayQuote}
                  homeQuote={homeQuote}
                  awayFallbackColor={colors.info.default}
                  homeFallbackColor={colors.success.default}
                />
              </Box>
            </Box>
          )}
        </Box>
      </NativePressable>
      {awayQuote || homeQuote ? (
        <Box twClassName="flex-row gap-2 pt-2">
          <Box twClassName="min-w-0 flex-1">
            <Quote
              event={event}
              selection="away"
              team={game.awayTeam}
              quote={awayQuote}
              onOrder={onOrder}
              fallbackColor={colors.info.default}
            />
          </Box>
          <Box twClassName="min-w-0 flex-1">
            <Quote
              event={event}
              selection="home"
              team={game.homeTeam}
              quote={homeQuote}
              onOrder={onOrder}
              fallbackColor={colors.success.default}
            />
          </Box>
        </Box>
      ) : null}
      {variant === 'compact' ? (
        <Box twClassName="pt-3">
          <CompactFooter
            event={event}
            representedMarketIds={representedMarketIds}
            onPress={onPress}
          />
        </Box>
      ) : null}
    </Box>
  );
};
