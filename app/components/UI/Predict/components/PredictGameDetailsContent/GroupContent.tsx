import React, { memo, useMemo, useState } from 'react';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
} from '../../types';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import PredictSportOutcomeCard, {
  type PredictSportOutcomeButton,
} from '../PredictSportOutcomeCard';
import { formatVolume } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';

const I18N_PREFIX = 'predict.sports_market_types';

export const getSportsMarketTypeLabel = (type: string): string => {
  const i18nKey = `${I18N_PREFIX}.${type}`;
  const label = strings(i18nKey);
  return label;
};

const noop = () => undefined;

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
): PredictBetButtonVariant => {
  if (total === 3 && index === 1) return 'draw';
  return index === 0 ? 'yes' : 'no';
};

const buildButtons = (
  outcome: PredictOutcome,
  game?: PredictMarketGame,
  sportsMarketType?: string,
): PredictSportOutcomeButton[] =>
  outcome.tokens.map((token, index) => ({
    label: token.title,
    price: Math.round(token.price * 100),
    onPress: noop,
    variant: getButtonVariant(index, outcome.tokens.length),
    teamColor: isMoneylineType(sportsMarketType)
      ? getTeamColor(token.title, game)
      : undefined,
  }));

const buildSubtitle = (outcome: PredictOutcome): string =>
  `$${formatVolume(outcome.volume)} Vol`;

const SimpleOutcomeCard = memo(
  ({
    outcome,
    title,
    game,
    sportsMarketType,
    testID,
  }: {
    outcome: PredictOutcome;
    title: string;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => (
    <PredictSportOutcomeCard
      title={title}
      subtitle={buildSubtitle(outcome)}
      buttons={buildButtons(outcome, game, sportsMarketType)}
      testID={testID}
    />
  ),
);

SimpleOutcomeCard.displayName = 'SimpleOutcomeCard';

const LineOutcomeCard = memo(
  ({
    outcomes,
    title,
    game,
    sportsMarketType,
    testID,
  }: {
    outcomes: PredictOutcome[];
    title: string;
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

    const selectedOutcome = useMemo(
      () => outcomes.find((o) => o.line === selectedLine) ?? outcomes[0],
      [outcomes, selectedLine],
    );

    return (
      <PredictSportOutcomeCard
        title={title}
        subtitle={buildSubtitle(selectedOutcome)}
        buttons={buildButtons(selectedOutcome, game, sportsMarketType)}
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
    game,
    groupKey,
    index,
  }: {
    subgroup: PredictOutcomeGroup;
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
        game={game}
        sportsMarketType={subgroup.key}
        testID={testID}
      />
    );
  },
);

SubgroupCards.displayName = 'SubgroupCards';

const GroupContent = memo(
  ({
    group,
    game,
  }: {
    group: PredictOutcomeGroup;
    game?: PredictMarketGame;
  }) => {
    if (group.subgroups && group.subgroups.length > 0) {
      return (
        <>
          {group.subgroups.map((subgroup, index) => (
            <SubgroupCards
              key={subgroup.key}
              subgroup={subgroup}
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
            title={outcome.groupItemTitle || outcome.title}
            game={game}
            sportsMarketType={outcome.sportsMarketType}
            testID={`${group.key}-outcome-${index}`}
          />
        ))}
      </>
    );
  },
);

GroupContent.displayName = 'GroupContent';

export default GroupContent;
