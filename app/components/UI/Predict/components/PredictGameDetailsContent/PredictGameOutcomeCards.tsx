import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { PredictMarketGame, PredictOutcomeGroup } from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import PredictSportOutcomeCard from '../PredictSportOutcomeCard';
import {
  buildButtons,
  buildMoneylineButtons,
  buildMoneylineSubtitle,
  buildSubtitle,
  type BuyHandler,
  formatOutcomeCardTitle,
  getDefaultLineIndex,
  getFallbackSportsMarketTypeLabel,
  getSportsMarketTypeLabel,
  getTranslatedSportsMarketTypeLabel,
  sortMoneylineOutcomes,
} from './utils';

const SimpleOutcomeCard = memo(
  ({
    outcome,
    title,
    onBuyPress,
    game,
    sportsMarketType,
    testID,
  }: {
    outcome: PredictOutcomeGroup['outcomes'][number];
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
    outcomes: PredictOutcomeGroup['outcomes'];
    title?: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
  }) => {
    const lineIndices = useMemo(
      () =>
        outcomes
          .map((outcome, index) => (outcome.line != null ? index : -1))
          .filter((index) => index !== -1),
      [outcomes],
    );

    const lines = useMemo(
      () => lineIndices.map((i) => Math.abs(outcomes[i].line ?? 0)),
      [lineIndices, outcomes],
    );

    const defaultSelectedIdx = useMemo(
      () => getDefaultLineIndex(outcomes, lineIndices),
      [outcomes, lineIndices],
    );

    const [selectedIdx, setSelectedIdx] = useState(defaultSelectedIdx);

    useEffect(() => {
      setSelectedIdx(defaultSelectedIdx);
    }, [defaultSelectedIdx]);

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

    if (!selectedOutcome) return null;

    return (
      <PredictSportOutcomeCard
        title={title ?? formatOutcomeCardTitle(selectedOutcome)}
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

const MoneylineCard = memo(
  ({
    outcomes,
    onBuyPress,
    game,
    title,
    testID,
  }: {
    outcomes: PredictOutcomeGroup['outcomes'];
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    title: string;
    testID: string;
  }) => {
    const subtitle = useMemo(
      () => buildMoneylineSubtitle(outcomes),
      [outcomes],
    );
    const tokenIds = useMemo(
      () =>
        sortMoneylineOutcomes(outcomes, game)
          .map((outcome) => outcome.tokens[0]?.id)
          .filter((id): id is string => Boolean(id)),
      [outcomes, game],
    );
    const { getPrice } = useLiveMarketPrices(tokenIds);
    const buttons = useMemo(
      () => buildMoneylineButtons(outcomes, onBuyPress, game, getPrice),
      [outcomes, onBuyPress, game, getPrice],
    );

    return (
      <PredictSportOutcomeCard
        title={title}
        subtitle={subtitle}
        buttons={buttons}
        buttonLayout="inlineNoSeparator"
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
    const translatedTitle = getTranslatedSportsMarketTypeLabel(subgroup.key);
    const firstOutcomeTitle = subgroup.outcomes[0]
      ? formatOutcomeCardTitle(subgroup.outcomes[0])
      : undefined;
    const title = getFallbackSportsMarketTypeLabel(
      subgroup.key,
      translatedTitle ?? firstOutcomeTitle,
    );
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
        title={translatedTitle}
        onBuyPress={onBuyPress}
        game={game}
        sportsMarketType={subgroup.key}
        testID={testID}
      />
    );
  },
);

SubgroupCards.displayName = 'SubgroupCards';

export const OutcomesContent = memo(
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
          title={getSportsMarketTypeLabel(
            firstType,
            formatOutcomeCardTitle(group.outcomes[0]),
          )}
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
