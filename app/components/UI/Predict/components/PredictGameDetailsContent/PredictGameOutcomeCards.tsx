import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { PredictMarketGame, PredictOutcomeGroup } from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import {
  isMoneylineLikeMarketType,
  shouldShowRegTimeTag as shouldShowRegTimeTagForOutcome,
} from '../../constants/sports';
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
  getMoneylineButtonEntries,
  getSportsMarketTypeLabelForGame,
  getTranslatedSportsMarketTypeLabel,
} from './utils';

const SimpleOutcomeCard = memo(
  ({
    outcome,
    title,
    onBuyPress,
    game,
    sportsMarketType,
    nonRegTimeSportsMarketTypes,
    onRegTimeInfoPress,
    testID,
  }: {
    outcome: PredictOutcomeGroup['outcomes'][number];
    title: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    nonRegTimeSportsMarketTypes: string[];
    onRegTimeInfoPress?: () => void;
    testID: string;
  }) => (
    <PredictSportOutcomeCard
      title={title}
      subtitle={buildSubtitle(outcome)}
      buttons={buildButtons(outcome, onBuyPress, game, sportsMarketType)}
      showRegTimeTag={shouldShowRegTimeTagForOutcome({
        game,
        sportsMarketType,
        nonRegTimeSportsMarketTypes,
      })}
      onPressRegTimeInfo={onRegTimeInfoPress}
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
    nonRegTimeSportsMarketTypes,
    onRegTimeInfoPress,
    testID,
  }: {
    outcomes: PredictOutcomeGroup['outcomes'];
    title?: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    nonRegTimeSportsMarketTypes: string[];
    onRegTimeInfoPress?: () => void;
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
        showRegTimeTag={shouldShowRegTimeTagForOutcome({
          game,
          sportsMarketType,
          nonRegTimeSportsMarketTypes,
        })}
        onPressRegTimeInfo={onRegTimeInfoPress}
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
    sportsMarketType,
    nonRegTimeSportsMarketTypes,
    onRegTimeInfoPress,
    testID,
  }: {
    outcomes: PredictOutcomeGroup['outcomes'];
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    title: string;
    sportsMarketType?: string;
    nonRegTimeSportsMarketTypes: string[];
    onRegTimeInfoPress?: () => void;
    testID: string;
  }) => {
    const subtitle = useMemo(
      () => buildMoneylineSubtitle(outcomes),
      [outcomes],
    );
    const tokenIds = useMemo(
      () =>
        getMoneylineButtonEntries(outcomes, game)
          .map(({ token }) => token.id)
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
        showRegTimeTag={shouldShowRegTimeTagForOutcome({
          game,
          sportsMarketType,
          nonRegTimeSportsMarketTypes,
        })}
        onPressRegTimeInfo={onRegTimeInfoPress}
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
    nonRegTimeSportsMarketTypes,
    onRegTimeInfoPress,
  }: {
    subgroup: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    groupKey: string;
    index: number;
    nonRegTimeSportsMarketTypes: string[];
    onRegTimeInfoPress?: () => void;
  }) => {
    const translatedTitle = subgroup.title
      ? undefined
      : getTranslatedSportsMarketTypeLabel(subgroup.key);
    const firstOutcomeTitle = subgroup.outcomes[0]
      ? formatOutcomeCardTitle(subgroup.outcomes[0])
      : undefined;
    const fallbackTitle =
      subgroup.title ??
      getFallbackSportsMarketTypeLabel(
        subgroup.key,
        translatedTitle ?? firstOutcomeTitle,
      );
    const title = getSportsMarketTypeLabelForGame(
      subgroup.key,
      fallbackTitle,
      game,
    );
    const testID = `${groupKey}-${subgroup.key}-${index}`;

    if (isMoneylineLikeMarketType(subgroup.key)) {
      return (
        <MoneylineCard
          outcomes={subgroup.outcomes}
          onBuyPress={onBuyPress}
          game={game}
          title={title}
          sportsMarketType={subgroup.key}
          nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
          onRegTimeInfoPress={onRegTimeInfoPress}
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
          nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
          onRegTimeInfoPress={onRegTimeInfoPress}
          testID={testID}
        />
      );
    }

    return (
      <LineOutcomeCard
        outcomes={subgroup.outcomes}
        title={subgroup.title ?? translatedTitle}
        onBuyPress={onBuyPress}
        game={game}
        sportsMarketType={subgroup.key}
        nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
        onRegTimeInfoPress={onRegTimeInfoPress}
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
    nonRegTimeSportsMarketTypes = [],
    onRegTimeInfoPress,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    nonRegTimeSportsMarketTypes?: string[];
    onRegTimeInfoPress?: () => void;
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
              nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
              onRegTimeInfoPress={onRegTimeInfoPress}
            />
          ))}
        </>
      );
    }

    const firstType = group.outcomes[0]?.sportsMarketType;
    if (firstType && isMoneylineLikeMarketType(firstType)) {
      return (
        <MoneylineCard
          outcomes={group.outcomes}
          onBuyPress={onBuyPress}
          game={game}
          title={getSportsMarketTypeLabelForGame(
            firstType,
            formatOutcomeCardTitle(group.outcomes[0]),
            game,
          )}
          sportsMarketType={firstType}
          nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
          onRegTimeInfoPress={onRegTimeInfoPress}
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
            nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
            onRegTimeInfoPress={onRegTimeInfoPress}
            testID={`${group.key}-outcome-${index}`}
          />
        ))}
      </>
    );
  },
);

OutcomesContent.displayName = 'OutcomesContent';
