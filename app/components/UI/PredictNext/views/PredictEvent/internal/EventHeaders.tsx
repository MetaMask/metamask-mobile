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
import { strings } from '../../../../../../../locales/i18n';
import {
  createGamePresentation,
  getEventGame,
  type GameSelection,
  type GameStatusLine,
} from '../../../events/game';
import type { PredictEvent, PredictTeam } from '../../../types';
import { PredictEventScreenTestIds } from '../PredictEventScreen.testIds';

export const EventLoadingHeader = () => (
  <Box
    testID={PredictEventScreenTestIds.LOADING}
    accessibilityLabel={strings('predict.event.loading_accessibility_label')}
    twClassName="gap-3"
  >
    <Box twClassName="h-24 rounded-xl bg-muted" />
    <Box twClassName="h-4 w-2/3 rounded bg-muted" />
  </Box>
);

export const StandardEventHeader = ({ event }: { event: PredictEvent }) => {
  const tw = useTailwind();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(event.imageUrl && !imageFailed);

  if (!showImage && !event.subtitle) {
    return (
      <Box
        testID={PredictEventScreenTestIds.STANDARD_HEADER}
        twClassName="h-0"
      />
    );
  }

  return (
    <Box testID={PredictEventScreenTestIds.STANDARD_HEADER} twClassName="gap-3">
      <Box twClassName="flex-row items-start gap-3">
        {showImage ? (
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
        {event.subtitle ? (
          <Text
            testID={PredictEventScreenTestIds.SUBTITLE}
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="min-w-0 flex-1"
          >
            {event.subtitle}
          </Text>
        ) : null}
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
    <Box twClassName="h-14 w-14 items-center justify-center" accessible={false}>
      {team.logoUrl && !imageFailed ? (
        <ExpoImage
          testID={PredictEventScreenTestIds.teamLogo(selection)}
          source={team.logoUrl}
          recyclingKey={team.logoUrl}
          contentFit="contain"
          style={tw.style('h-14 w-14')}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Box twClassName="h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Text
            testID={PredictEventScreenTestIds.teamLogoFallback(selection)}
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
          >
            {abbreviation}
          </Text>
        </Box>
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
