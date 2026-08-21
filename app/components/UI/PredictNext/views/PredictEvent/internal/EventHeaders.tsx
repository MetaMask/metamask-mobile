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
import {
  createGamePresentation,
  getEventGame,
  type GameSelection,
  type GameStatusLine,
} from '../../../events/game';
import type { PredictEvent, PredictTeam } from '../../../types';
import { PredictEventScreenTestIds } from '../PredictEventScreen.testIds';

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

const TeamLogo = ({
  team,
  abbreviation,
  selection,
}: {
  team: PredictTeam;
  abbreviation: string;
  selection: GameSelection;
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
          {abbreviation}
        </Text>
      )}
    </Box>
  );
};

const GameTeam = ({
  team,
  abbreviation,
  score,
  selection,
}: {
  team: PredictTeam;
  abbreviation: string;
  score?: string;
  selection: GameSelection;
}) => (
  <Box
    testID={PredictEventScreenTestIds.team(selection)}
    accessible
    accessibilityLabel={
      score === undefined ? team.name : `${team.name}, ${score}`
    }
    twClassName="min-w-0 flex-1 items-center gap-2"
  >
    <TeamLogo team={team} abbreviation={abbreviation} selection={selection} />
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

const GameStatus = ({
  line,
  isLive,
}: {
  line: GameStatusLine;
  isLive: boolean;
}) => (
  <Box twClassName="w-24 shrink-0 items-center gap-1">
    <Text
      testID={PredictEventScreenTestIds.GAME_STATUS}
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Bold}
      color={isLive ? TextColor.SuccessDefault : TextColor.TextAlternative}
      twClassName="text-center"
    >
      {line.label}
    </Text>
    {line.metadata ? (
      <Text
        testID={PredictEventScreenTestIds.GAME_METADATA}
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {line.metadata}
      </Text>
    ) : null}
  </Box>
);

export const GameEventHeader = ({ event }: { event: PredictEvent }) => {
  const game = getEventGame(event);
  if (!game) {
    return null;
  }

  const presentation = createGamePresentation(event, game);

  return (
    <Box testID={PredictEventScreenTestIds.GAME_HEADER} twClassName="gap-6">
      <EventTitle>{event.title}</EventTitle>
      <Box twClassName="flex-row items-start gap-2">
        <GameTeam
          team={presentation.teams.away.team}
          abbreviation={presentation.teams.away.abbreviation}
          score={game.score?.away}
          selection="away"
        />
        <GameStatus
          line={presentation.status.detail}
          isLive={game.status === 'in_progress'}
        />
        <GameTeam
          team={presentation.teams.home.team}
          abbreviation={presentation.teams.home.abbreviation}
          score={game.score?.home}
          selection="home"
        />
      </Box>
    </Box>
  );
};
