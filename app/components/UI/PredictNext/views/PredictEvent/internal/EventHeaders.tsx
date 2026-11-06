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
  getGameTeamOrder,
  getMatchupSlot,
  shouldMirrorTeamLogo,
  type GameSelection,
  type GameStatusLine,
} from '../../../events/game';
import { TeamLogo } from '../../../events/shared/ui';
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

interface GameTeamProps {
  team: PredictTeam;
  abbreviation: string;
  score?: string;
  selection: GameSelection;
  mirrored: boolean;
}

/** A Team: its helmet over its abbreviation. The score sits beside. */
const GameTeam = ({
  team,
  abbreviation,
  score,
  selection,
  mirrored,
}: GameTeamProps) => (
  <Box
    testID={PredictEventScreenTestIds.team(selection)}
    accessible
    accessibilityLabel={
      score === undefined ? team.name : `${team.name}, ${score}`
    }
    twClassName="w-14 items-center gap-2"
  >
    <TeamLogo
      team={team}
      abbreviation={abbreviation}
      size="medium"
      flipped={mirrored}
      testID={PredictEventScreenTestIds.teamLogo(selection)}
      fallbackTestID={PredictEventScreenTestIds.teamLogoFallback(selection)}
    />
    <Text
      testID={PredictEventScreenTestIds.teamAbbreviation(selection)}
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {abbreviation}
    </Text>
  </Box>
);

/** Read as part of its Team's label, so hidden from screen readers. */
const GameScore = ({
  score,
  selection,
}: {
  score?: string;
  selection: GameSelection;
}) =>
  score === undefined ? null : (
    <Text
      testID={PredictEventScreenTestIds.teamScore(selection)}
      variant={TextVariant.DisplayMd}
      fontWeight={FontWeight.Bold}
      twClassName="shrink-0"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {score}
    </Text>
  );

const GameStatus = ({
  line,
  isLive,
}: {
  line: GameStatusLine;
  isLive: boolean;
}) => (
  // Takes the width the Teams and scores leave, and wraps inside it, so the
  // row never pushes the right Team past the screen padding.
  <Box twClassName="min-w-0 flex-1 items-center">
    <Box twClassName="max-w-full flex-row items-center gap-2">
      {isLive ? (
        <Box
          testID={PredictEventScreenTestIds.LIVE_DOT}
          twClassName="h-2.5 w-2.5 rounded-full bg-success-default"
        />
      ) : null}
      <Text
        testID={PredictEventScreenTestIds.GAME_STATUS}
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={isLive ? TextColor.SuccessDefault : TextColor.TextAlternative}
        twClassName="shrink text-center"
      >
        {line.label}
      </Text>
    </Box>
    {line.metadata ? (
      <Text
        testID={PredictEventScreenTestIds.GAME_METADATA}
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
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
  const order = getGameTeamOrder(game);
  const teamProps = (selection: GameSelection): GameTeamProps => {
    const { team, abbreviation } = presentation.teams[selection];
    return {
      team,
      abbreviation,
      score: game.score?.[selection],
      selection,
      mirrored: shouldMirrorTeamLogo(team, getMatchupSlot(order, selection)),
    };
  };

  // With the screen's 16px padding, the 56px Team columns put each 40px
  // helmet 40px from the screen edge.
  return (
    <Box
      testID={PredictEventScreenTestIds.GAME_HEADER}
      twClassName="flex-row items-center justify-between gap-6 px-4 py-4"
    >
      <GameTeam {...teamProps(order[0])} />
      <GameScore score={game.score?.[order[0]]} selection={order[0]} />
      <GameStatus
        line={presentation.status.detail}
        isLive={game.status === 'in_progress'}
      />
      <GameScore score={game.score?.[order[1]]} selection={order[1]} />
      <GameTeam {...teamProps(order[1])} />
    </Box>
  );
};
