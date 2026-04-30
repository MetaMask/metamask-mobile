import React, { memo, useEffect, useMemo, useState } from 'react';
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
import { strings } from '../../../../../../locales/i18n';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';

const noop = () => undefined;

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

const isMoneylineType = (type?: string): boolean =>
  type === 'moneyline' || type === 'first_half_moneyline';

const getTeamColor = (
  tokenTitle: string,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game) return undefined;
  if (tokenTitle === game.homeTeam.abbreviation) return game.homeTeam.color;
  if (tokenTitle === game.awayTeam.abbreviation) return game.awayTeam.color;
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
  onBuyPress?: BuyHandler,
  game?: PredictMarketGame,
  sportsMarketType?: string,
): PredictSportOutcomeButton[] => {
  const moneyline = isMoneylineType(sportsMarketType);
  return outcome.tokens.map((token, index) => ({
    label: token.shortTitle ?? token.title,
    price: Math.round(token.price * 100),
    onPress: onBuyPress ? () => onBuyPress(outcome, token) : noop,
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
    onBuyPress?: BuyHandler;
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
    onBuyPress?: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => {
    const lines = useMemo(
      () =>
        outcomes
          .map((o) => o.line)
          .filter((l): l is number => l != null)
          .sort((a, b) => a - b),
      [outcomes],
    );

    const [selectedLine, setSelectedLine] = useState(outcomes[0]?.line);

    useEffect(() => {
      setSelectedLine(outcomes[0]?.line);
    }, [outcomes]);

    const selectedOutcome = useMemo(
      () => outcomes.find((o) => o.line === selectedLine) ?? outcomes[0],
      [outcomes, selectedLine],
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
        selectedLine={selectedLine}
        onSelectLine={setSelectedLine}
        testID={testID}
      />
    );
  },
);

LineOutcomeCard.displayName = 'LineOutcomeCard';

const SubgroupCards = memo(
  ({
    subgroup,
    onBuyPress,
    game,
    groupKey,
    index,
  }: {
    subgroup: PredictOutcomeGroup;
    onBuyPress?: BuyHandler;
    game?: PredictMarketGame;
    groupKey: string;
    index: number;
  }) => {
    const title = getSportsMarketTypeLabel(subgroup.key);
    const testID = `${groupKey}-${subgroup.key}-${index}`;

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
    onBuyPress?: BuyHandler;
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
