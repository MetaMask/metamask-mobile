import React, { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import type {
  PredictEvent,
  PredictGame,
  PredictGameStatus,
  PredictTeam,
} from '../../../types';
import { PredictEventScreenTestIds } from '../PredictEventScreen.testIds';

const STATUS_KEYS: Record<PredictGameStatus, string> = {
  scheduled: 'scheduled',
  in_progress: 'live',
  delayed: 'delayed',
  suspended: 'suspended',
  postponed: 'postponed',
  completed: 'final',
  canceled: 'canceled',
};

const EventTitle = ({ children }: { children: string }) => (
  <Text
    testID={PredictEventScreenTestIds.TITLE}
    accessibilityRole="header"
    variant={TextVariant.HeadingLg}
  >
    {children}
  </Text>
);

export const EventLoadingHeader = ({ title }: { title: string }) => (
  <Box twClassName="gap-4">
    <EventTitle>{title}</EventTitle>
    <Box
      testID={PredictEventScreenTestIds.LOADING}
      accessibilityLabel="Loading event"
      twClassName="gap-3"
    >
      <Box twClassName="h-24 rounded-xl bg-muted" />
      <Box twClassName="h-4 w-2/3 rounded bg-muted" />
    </Box>
  </Box>
);

export const StandardEventHeader = ({ event }: { event: PredictEvent }) => {
  const tw = useTailwind();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Box testID={PredictEventScreenTestIds.STANDARD_HEADER} twClassName="gap-3">
      <Box twClassName="flex-row items-start gap-3">
        {event.imageUrl && !imageFailed ? (
          <ExpoImage
            testID={PredictEventScreenTestIds.IMAGE}
            source={event.imageUrl}
            recyclingKey={event.imageUrl}
            contentFit="cover"
            style={tw.style('h-12 w-12 rounded-lg')}
            onError={() => setImageFailed(true)}
            accessible={false}
          />
        ) : null}
        <Box twClassName="min-w-0 flex-1 gap-1">
          <EventTitle>{event.title}</EventTitle>
          {event.subtitle ? (
            <Text
              testID={PredictEventScreenTestIds.SUBTITLE}
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {event.subtitle}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

const getTeamAbbreviation = (team: PredictTeam) =>
  (team.abbreviation ?? team.name.slice(0, 3)).toUpperCase();

const TeamLogo = ({
  team,
  selection,
}: {
  team: PredictTeam;
  selection: 'away' | 'home';
}) => {
  const tw = useTailwind();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Box
      twClassName="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted"
      accessible={false}
    >
      {team.logoUrl && !imageFailed ? (
        <ExpoImage
          testID={PredictEventScreenTestIds.teamLogo(selection)}
          source={team.logoUrl}
          recyclingKey={team.logoUrl}
          contentFit="contain"
          style={tw.style('h-12 w-12')}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text
          testID={PredictEventScreenTestIds.teamLogoFallback(selection)}
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Bold}
        >
          {getTeamAbbreviation(team)}
        </Text>
      )}
    </Box>
  );
};

const GameTeam = ({
  team,
  score,
  selection,
}: {
  team: PredictTeam;
  score?: string;
  selection: 'away' | 'home';
}) => (
  <Box
    testID={PredictEventScreenTestIds.team(selection)}
    accessible
    accessibilityLabel={
      score === undefined ? team.name : `${team.name}, ${score}`
    }
    twClassName="min-w-0 flex-1 items-center gap-2"
  >
    <TeamLogo team={team} selection={selection} />
    {score !== undefined ? (
      <Text
        testID={PredictEventScreenTestIds.teamScore(selection)}
        variant={TextVariant.DisplayMd}
        fontWeight={FontWeight.Bold}
      >
        {score}
      </Text>
    ) : null}
    <Text
      testID={PredictEventScreenTestIds.teamName(selection)}
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Bold}
      twClassName="text-center"
    >
      {team.name}
    </Text>
  </Box>
);

const formatStart = (startsAt: string | undefined): string | undefined => {
  if (!startsAt) {
    return undefined;
  }

  const date = new Date(startsAt);
  const day = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
  const time = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${day} · ${time}`;
};

const GameStatus = ({
  game,
  startsAt,
}: {
  game: PredictGame;
  startsAt?: string;
}) => {
  const metadata = [
    game.status === 'scheduled' ? formatStart(startsAt) : undefined,
    game.period,
    game.clock,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box twClassName="w-24 shrink-0 items-center gap-1">
      <Text
        testID={PredictEventScreenTestIds.GAME_STATUS}
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={
          game.status === 'in_progress'
            ? TextColor.SuccessDefault
            : TextColor.TextAlternative
        }
        twClassName="text-center"
      >
        {strings(`predict.game_status.${STATUS_KEYS[game.status]}`)}
      </Text>
      {metadata ? (
        <Text
          testID={PredictEventScreenTestIds.GAME_METADATA}
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {metadata}
        </Text>
      ) : null}
    </Box>
  );
};

export const GameEventHeader = ({ event }: { event: PredictEvent }) => {
  const game = event.sports?.game;
  if (!game) {
    return null;
  }

  return (
    <Box testID={PredictEventScreenTestIds.GAME_HEADER} twClassName="gap-6">
      <EventTitle>{event.title}</EventTitle>
      <Box twClassName="flex-row items-start gap-2">
        <GameTeam
          team={game.awayTeam}
          score={game.score?.away}
          selection="away"
        />
        <GameStatus game={game} startsAt={event.startsAt} />
        <GameTeam
          team={game.homeTeam}
          score={game.score?.home}
          selection="home"
        />
      </Box>
    </Box>
  );
};
