import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import PredictSportOutcomeCard, {
  type PredictSportOutcomeButton,
} from '../PredictSportOutcomeCard';
import { formatVolume } from '../../utils/format';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import { strings } from '../../../../../../locales/i18n';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';

const I18N_PREFIX = 'predict.sports_market_types';

const toTitleCase = (str: string): string =>
  str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const getSportsMarketTypeLabel = (type: string): string => {
  const key = `${I18N_PREFIX}.${type}`;
  const label = strings(key);
  return label === key ? toTitleCase(type) : label;
};

type BuyHandler = (outcome: PredictOutcome, token: PredictOutcomeToken) => void;

const O_U_PLAYER_PATTERN = /^(.+?):\s+\w+ O\/U/;

const formatOutcomeCardTitle = (outcome: PredictOutcome): string => {
  const raw = outcome.groupItemTitle || outcome.title;
  if (!raw.includes('O/U')) return raw;

  const match = raw.match(O_U_PLAYER_PATTERN);
  if (match) return match[1].trim();

  const colonIdx = raw.indexOf(': ');
  if (colonIdx !== -1) return raw.slice(0, colonIdx).trim();

  return raw;
};

const getTeamColor = (
  tokenTitle: string,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game) return undefined;

  const normalizedTokenTitle = tokenTitle.trim().toLowerCase();
  const homeLabels = [
    game.homeTeam.abbreviation,
    game.homeTeam.name,
    game.homeTeam.alias,
  ]
    .filter((label): label is string => Boolean(label))
    .map((label) => label.trim().toLowerCase());
  const awayLabels = [
    game.awayTeam.abbreviation,
    game.awayTeam.name,
    game.awayTeam.alias,
  ]
    .filter((label): label is string => Boolean(label))
    .map((label) => label.trim().toLowerCase());

  if (homeLabels.includes(normalizedTokenTitle)) return game.homeTeam.color;
  if (awayLabels.includes(normalizedTokenTitle)) return game.awayTeam.color;
  return undefined;
};

const getButtonVariant = (
  index: number,
  total: number,
  moneyline: boolean,
): PredictBetButtonVariant => {
  if (!moneyline) return 'draw';
  if (total === 3 && index === 1) return 'draw';
  return index === 0 ? 'yes' : 'no';
};

const buildButtons = (
  outcome: PredictOutcome,
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  sportsMarketType?: string,
): PredictSportOutcomeButton[] => {
  const moneyline = isMoneylineLikeMarketType(sportsMarketType);
  return outcome.tokens.map((token, index) => ({
    label: token.shortTitle ?? token.title,
    price: Math.round(token.price * 100),
    onPress: () => onBuyPress(outcome, token),
    variant: getButtonVariant(index, outcome.tokens.length, moneyline),
    teamColor: moneyline
      ? getTeamColor(token.shortTitle ?? token.title, game)
      : undefined,
  }));
};

const buildSubtitle = (outcome: PredictOutcome): string =>
  `$${formatVolume(outcome.volume)} Vol`;

const SimpleOutcomeCard = memo(
  ({
    outcome,
    title,
    onBuyPress,
    game,
    sportsMarketType,
    testID,
  }: {
    outcome: PredictOutcome;
    title: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => (
    <PredictSportOutcomeCard
      title={title}
      subtitle={buildSubtitle(outcome)}
      buttons={buildButtons(outcome, onBuyPress, game, sportsMarketType)}
      testID={testID}
    />
  ),
);

SimpleOutcomeCard.displayName = 'SimpleOutcomeCard';

const LineOutcomeCard = memo(
  ({
    outcomes,
    title,
    onBuyPress,
    game,
    sportsMarketType,
    testID,
  }: {
    outcomes: PredictOutcome[];
    title: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => {
    const lineIndices = useMemo(
      () =>
        outcomes
          .map((o, i) => (o.line != null ? i : -1))
          .filter((i) => i !== -1)
          .sort((a, b) => {
            const lineA = outcomes[a].line ?? 0;
            const lineB = outcomes[b].line ?? 0;
            return lineA - lineB;
          }),
      [outcomes],
    );

    const lines = useMemo(
      () => lineIndices.map((i) => Math.abs(outcomes[i].line ?? 0)),
      [lineIndices, outcomes],
    );

    const [selectedIdx, setSelectedIdx] = useState(0);

    useEffect(() => {
      setSelectedIdx(0);
    }, [outcomes]);

    const handleSelectLine = useCallback(
      (_line: number, indexInLines: number) => {
        setSelectedIdx(indexInLines);
      },
      [],
    );

    const selectedOutcome = useMemo(
      () => outcomes[lineIndices[selectedIdx]] ?? outcomes[0],
      [outcomes, lineIndices, selectedIdx],
    );

    return (
      <PredictSportOutcomeCard
        title={title}
        subtitle={buildSubtitle(selectedOutcome)}
        buttons={buildButtons(
          selectedOutcome,
          onBuyPress,
          game,
          sportsMarketType,
        )}
        lines={lines}
        selectedLine={lines[selectedIdx]}
        selectedIndex={selectedIdx}
        onSelectLine={handleSelectLine}
        testID={testID}
      />
    );
  },
);

LineOutcomeCard.displayName = 'LineOutcomeCard';

const isDrawOutcome = (outcome: PredictOutcome): boolean =>
  outcome.groupItemTitle?.toLowerCase().startsWith('draw') ?? false;

const sortMoneylineOutcomes = (
  outcomes: PredictOutcome[],
  game?: PredictMarketGame,
): PredictOutcome[] => {
  const hasThresholds = outcomes.some((o) => o.groupItemThreshold != null);
  if (hasThresholds) {
    return [...outcomes].sort(
      (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
    );
  }

  const draw = outcomes.find(isDrawOutcome);
  const nonDraw = outcomes.filter((o) => !isDrawOutcome(o));
  if (!draw || nonDraw.length < 2) {
    return [...outcomes];
  }

  if (game) {
    const homeAbbr = game.homeTeam.abbreviation;
    const home = nonDraw.find((o) => o.tokens[0]?.shortTitle === homeAbbr);
    const away = nonDraw.find((o) => o !== home);
    if (home && away) {
      return [home, draw, away];
    }
  }

  const sorted = [...nonDraw].sort((a, b) =>
    (a.groupItemTitle ?? '').localeCompare(b.groupItemTitle ?? ''),
  );
  return [sorted[0], draw, ...sorted.slice(1)];
};

const buildMoneylineButtons = (
  outcomes: PredictOutcome[],
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
): PredictSportOutcomeButton[] => {
  const sortedWithTokens = sortMoneylineOutcomes(outcomes, game).filter(
    (outcome) => outcome.tokens[0] !== undefined,
  );

  return sortedWithTokens.map((outcome, i) => {
    const yesToken = outcome.tokens[0];

    return {
      label: yesToken.shortTitle ?? yesToken.title,
      price: Math.round(yesToken.price * 100),
      onPress: () => onBuyPress(outcome, yesToken),
      variant: getButtonVariant(i, sortedWithTokens.length, true),
      teamColor: getTeamColor(yesToken.shortTitle ?? yesToken.title, game),
    };
  });
};

const buildMoneylineSubtitle = (outcomes: PredictOutcome[]): string => {
  const totalVolume = outcomes.reduce((sum, o) => sum + o.volume, 0);
  return `$${formatVolume(totalVolume)} Vol`;
};

const MoneylineCard = memo(
  ({
    outcomes,
    onBuyPress,
    game,
    title,
    testID,
  }: {
    outcomes: PredictOutcome[];
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    title: string;
    testID: string;
  }) => {
    const subtitle = useMemo(
      () => buildMoneylineSubtitle(outcomes),
      [outcomes],
    );
    const buttons = useMemo(
      () => buildMoneylineButtons(outcomes, onBuyPress, game),
      [outcomes, onBuyPress, game],
    );

    return (
      <PredictSportOutcomeCard
        title={title}
        subtitle={subtitle}
        buttons={buttons}
        buttonLayout="stacked"
        testID={testID}
      />
    );
  },
);

MoneylineCard.displayName = 'MoneylineCard';

const SubgroupCards = memo(
  ({
    subgroup,
    onBuyPress,
    game,
    groupKey,
    index,
  }: {
    subgroup: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    groupKey: string;
    index: number;
  }) => {
    const title = getSportsMarketTypeLabel(subgroup.key);
    const testID = `${groupKey}-${subgroup.key}-${index}`;

    if (
      isMoneylineLikeMarketType(subgroup.key) &&
      subgroup.outcomes.length > 1
    ) {
      return (
        <MoneylineCard
          outcomes={subgroup.outcomes}
          onBuyPress={onBuyPress}
          game={game}
          title={title}
          testID={testID}
        />
      );
    }

    if (subgroup.outcomes.length === 1) {
      return (
        <SimpleOutcomeCard
          outcome={subgroup.outcomes[0]}
          title={title}
          onBuyPress={onBuyPress}
          game={game}
          sportsMarketType={subgroup.key}
          testID={testID}
        />
      );
    }

    return (
      <LineOutcomeCard
        outcomes={subgroup.outcomes}
        title={title}
        onBuyPress={onBuyPress}
        game={game}
        sportsMarketType={subgroup.key}
        testID={testID}
      />
    );
  },
);

SubgroupCards.displayName = 'SubgroupCards';

const OutcomesContent = memo(
  ({
    group,
    onBuyPress,
    game,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
  }) => {
    if (group.subgroups && group.subgroups.length > 0) {
      return (
        <>
          {group.subgroups.map((subgroup, index) => (
            <SubgroupCards
              key={subgroup.key}
              subgroup={subgroup}
              onBuyPress={onBuyPress}
              game={game}
              groupKey={group.key}
              index={index}
            />
          ))}
        </>
      );
    }

    const firstType = group.outcomes[0]?.sportsMarketType;
    if (
      firstType &&
      isMoneylineLikeMarketType(firstType) &&
      group.outcomes.length > 1
    ) {
      return (
        <MoneylineCard
          outcomes={group.outcomes}
          onBuyPress={onBuyPress}
          game={game}
          title={getSportsMarketTypeLabel(firstType)}
          testID={`${group.key}-moneyline`}
        />
      );
    }

    return (
      <>
        {group.outcomes.map((outcome, index) => (
          <SimpleOutcomeCard
            key={outcome.id}
            outcome={outcome}
            title={formatOutcomeCardTitle(outcome)}
            onBuyPress={onBuyPress}
            game={game}
            sportsMarketType={outcome.sportsMarketType}
            testID={`${group.key}-outcome-${index}`}
          />
        ))}
      </>
    );
  },
);

OutcomesContent.displayName = 'OutcomesContent';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const PredictGameOutcomesTab = memo(
  ({ groupMap, game, activeChipKey, onBuyPress }: OutcomesTabProps) => {
    const selectedGroup = groupMap.get(activeChipKey);

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {selectedGroup && (
          <Box twClassName="px-4">
            <OutcomesContent
              group={selectedGroup}
              onBuyPress={onBuyPress}
              game={game}
            />
          </Box>
        )}
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
