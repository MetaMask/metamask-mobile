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
  isFootballEvent,
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

const LOGO_SIZE_CLASS_NAMES = { medium: 'h-10 w-10', large: 'h-14 w-14' };

const TeamLogo = ({
  team,
  abbreviation,
  selection,
  size,
}: {
  team: PredictTeam;
  abbreviation: string;
  selection: GameSelection;
  size: keyof typeof LOGO_SIZE_CLASS_NAMES;
}) => {
  const tw = useTailwind();
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClassName = LOGO_SIZE_CLASS_NAMES[size];

  return (
    <Box
      twClassName={`${sizeClassName} items-center justify-center`}
      accessible={false}
    >
      {team.logoUrl && !imageFailed ? (
        <ExpoImage
          testID={PredictEventScreenTestIds.teamLogo(selection)}
          source={team.logoUrl}
          recyclingKey={team.logoUrl}
          contentFit="contain"
          style={tw.style(sizeClassName)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Box
          twClassName={`${sizeClassName} items-center justify-center rounded-full bg-muted`}
        >
          <Text
            testID={PredictEventScreenTestIds.teamLogoFallback(selection)}
            variant={size === 'large' ? TextVariant.BodySm : TextVariant.BodyXs}
            fontWeight={FontWeight.Bold}
          >
            {abbreviation}
          </Text>
        </Box>
      )}
    </Box>
  );
};

interface GameTeamProps {
  team: PredictTeam;
  abbreviation: string;
  score?: string;
  selection: GameSelection;
}

const teamAccessibilityLabel = (team: PredictTeam, score?: string) =>
  score === undefined ? team.name : `${team.name}, ${score}`;

const GameTeam = ({ team, abbreviation, score, selection }: GameTeamProps) => (
  <Box
    testID={PredictEventScreenTestIds.team(selection)}
    accessible
    accessibilityLabel={teamAccessibilityLabel(team, score)}
    twClassName="min-w-0 flex-1 items-center gap-2"
  >
    <TeamLogo
      team={team}
      abbreviation={abbreviation}
      selection={selection}
      size="large"
    />
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

/** A football Team: its helmet over its abbreviation. The score sits beside. */
const FootballTeam = ({
  team,
  abbreviation,
  score,
  selection,
}: GameTeamProps) => (
  <Box
    testID={PredictEventScreenTestIds.team(selection)}
    accessible
    accessibilityLabel={teamAccessibilityLabel(team, score)}
    twClassName="w-14 items-center gap-2"
  >
    <TeamLogo
      team={team}
      abbreviation={abbreviation}
      selection={selection}
      size="medium"
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
const FootballScore = ({
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
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {score}
    </Text>
  );

const GameStatus = ({
  line,
  isLive,
  layout,
}: {
  line: GameStatusLine;
  isLive: boolean;
  layout: 'football' | 'default';
}) => {
  const football = layout === 'football';
  return (
    <Box
      twClassName={
        football ? 'items-center' : 'w-24 shrink-0 items-center gap-1'
      }
    >
      <Box twClassName="flex-row items-center gap-2">
        {football && isLive ? (
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
          twClassName="text-center"
        >
          {line.label}
        </Text>
      </Box>
      {line.metadata ? (
        <Text
          testID={PredictEventScreenTestIds.GAME_METADATA}
          variant={TextVariant.BodyXs}
          fontWeight={football ? FontWeight.Bold : undefined}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {line.metadata}
        </Text>
      ) : null}
    </Box>
  );
};

export const GameEventHeader = ({ event }: { event: PredictEvent }) => {
  const game = getEventGame(event);
  if (!game) {
    return null;
  }

  const presentation = createGamePresentation(event, game);
  const teamProps = (selection: GameSelection): GameTeamProps => ({
    ...presentation.teams[selection],
    score: game.score?.[selection],
    selection,
  });
  const status = (layout: 'football' | 'default') => (
    <GameStatus
      line={presentation.status.detail}
      isLive={game.status === 'in_progress'}
      layout={layout}
    />
  );

  if (isFootballEvent(event)) {
    // With the screen's 16px padding, the 56px Team columns put each 40px
    // helmet 40px from the screen edge.
    return (
      <Box
        testID={PredictEventScreenTestIds.GAME_HEADER}
        twClassName="flex-row items-center justify-between gap-6 px-4 py-4"
      >
        <FootballTeam {...teamProps('away')} />
        <FootballScore score={game.score?.away} selection="away" />
        {status('football')}
        <FootballScore score={game.score?.home} selection="home" />
        <FootballTeam {...teamProps('home')} />
      </Box>
    );
  }

  return (
    <Box testID={PredictEventScreenTestIds.GAME_HEADER} twClassName="gap-6">
      <Box twClassName="flex-row items-start gap-2">
        <GameTeam {...teamProps('away')} />
        {status('default')}
        <GameTeam {...teamProps('home')} />
      </Box>
    </Box>
  );
};
