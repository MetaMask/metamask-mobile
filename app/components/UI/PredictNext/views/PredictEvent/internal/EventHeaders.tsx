import React, { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  Box,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import HeaderSubpageGlass from '../../../../../../component-library/components-temp/HeaderSubpageGlass';
import { selectPredictBrandRefreshEnabled } from '../../../../../../selectors/featureFlagController/predictBrandRefresh';
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

const eventRulesButtonProps = (
  onRulesPress?: () => void,
): ButtonIconProps[] | undefined =>
  onRulesPress
    ? [
        {
          iconName: IconName.Question,
          onPress: onRulesPress,
          testID: PredictEventScreenTestIds.EVENT_RULES_BUTTON,
          accessibilityLabel: strings(
            'predict.rules.event_accessibility_label',
          ),
          accessibilityRole: 'button',
        },
      ]
    : undefined;

interface EventTopBarProps {
  onBack: () => void;
  /** Shows the Event rules button when set. */
  onRulesPress?: () => void;
}

/**
 * The one-line top bar for an Event that is loading, failed to load, or is a
 * Game (whose Teams sit in their own header below it).
 */
export const EventTitleHeader = ({
  title,
  onBack,
  onRulesPress,
}: EventTopBarProps & { title?: string }) => {
  const isGlass = useSelector(selectPredictBrandRefreshEnabled) === true;
  return (
    <HeaderStandardGlass
      isGlass={isGlass}
      isFloating={false}
      includesTopInset
      title={title}
      titleProps={{
        testID: PredictEventScreenTestIds.TITLE,
        accessibilityRole: 'header',
        numberOfLines: 1,
      }}
      onBack={onBack}
      backButtonProps={{ testID: PredictEventScreenTestIds.BACK }}
      endButtonIconProps={eventRulesButtonProps(onRulesPress)}
    />
  );
};

/** Renders nothing once the image fails, so the bar drops the avatar. */
const EventAvatar = ({ imageUrl }: { imageUrl: string }) => {
  const tw = useTailwind();
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return null;
  }

  return (
    <ExpoImage
      testID={PredictEventScreenTestIds.IMAGE}
      source={imageUrl}
      recyclingKey={imageUrl}
      contentFit="cover"
      style={tw.style('h-10 w-10 rounded-lg')}
      onError={() => setImageFailed(true)}
      accessible={false}
    />
  );
};

/**
 * The top bar of a standard Event: back, the Event image, the full title over
 * its category, and the Event rules button. The title never truncates; the
 * bar grows to fit it.
 */
export const StandardEventHeader = ({
  event,
  onBack,
  onRulesPress,
}: EventTopBarProps & { event: PredictEvent }) => {
  const isGlass = useSelector(selectPredictBrandRefreshEnabled) === true;
  return (
    <HeaderSubpageGlass
      testID={PredictEventScreenTestIds.STANDARD_HEADER}
      isGlass={isGlass}
      isFloating={false}
      includesTopInset
      twClassName="min-h-14 h-auto bg-default justify-center"
      onBack={onBack}
      backButtonProps={{ testID: PredictEventScreenTestIds.BACK }}
      endButtonIconProps={eventRulesButtonProps(onRulesPress)}
      avatar={
        event.imageUrl ? (
          <EventAvatar key={event.imageUrl} imageUrl={event.imageUrl} />
        ) : undefined
      }
      title={event.title}
      titleProps={{
        variant: TextVariant.HeadingMd,
        testID: PredictEventScreenTestIds.TITLE,
        accessibilityRole: 'header',
      }}
      description={event.category || undefined}
      descriptionProps={{ testID: PredictEventScreenTestIds.CATEGORY }}
    />
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
