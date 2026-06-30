import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { PredictMarketGame, PredictOutcomeGroup } from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import PredictSportOutcomeCard from '../PredictSportOutcomeCard';
import type { PredictSportOutcomeCardTitleInfo } from '../PredictSportOutcomeCard/PredictSportOutcomeCard';
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
  getWorldCupMarketInfo,
  type PredictGameMarketInfo,
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
    titleInfo,
    testID,
  }: {
    outcomes: PredictOutcomeGroup['outcomes'];
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    title: string;
    titleInfo?: PredictSportOutcomeCardTitleInfo;
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
        titleInfo={titleInfo}
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
    onMarketInfoPress,
  }: {
    subgroup: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    groupKey: string;
    index: number;
    onMarketInfoPress: (info: PredictGameMarketInfo) => void;
  }) => {
    const translatedTitle = subgroup.title
      ? undefined
      : getTranslatedSportsMarketTypeLabel(subgroup.key);
    const firstOutcomeTitle = subgroup.outcomes[0]
      ? formatOutcomeCardTitle(subgroup.outcomes[0])
      : undefined;
    const marketInfo = getWorldCupMarketInfo(subgroup.key, game);
    const title =
      marketInfo?.title ??
      subgroup.title ??
      getFallbackSportsMarketTypeLabel(
        subgroup.key,
        translatedTitle ?? firstOutcomeTitle,
      );
    const testID = `${groupKey}-${subgroup.key}-${index}`;
    const handleInfoPress = useCallback(() => {
      if (marketInfo) {
        onMarketInfoPress(marketInfo);
      }
    }, [marketInfo, onMarketInfoPress]);
    const titleInfo = marketInfo
      ? {
          accessibilityLabel: marketInfo.title,
          onPress: handleInfoPress,
          testID: `${testID}-info`,
        }
      : undefined;

    if (isMoneylineLikeMarketType(subgroup.key)) {
      return (
        <MoneylineCard
          outcomes={subgroup.outcomes}
          onBuyPress={onBuyPress}
          game={game}
          title={title}
          titleInfo={titleInfo}
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
        title={subgroup.title ?? translatedTitle}
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
    onMarketInfoPress = () => undefined,
  }: {
    group: PredictOutcomeGroup;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    onMarketInfoPress?: (info: PredictGameMarketInfo) => void;
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
              onMarketInfoPress={onMarketInfoPress}
            />
          ))}
        </>
      );
    }

    const firstType = group.outcomes[0]?.sportsMarketType;
    if (firstType && isMoneylineLikeMarketType(firstType)) {
      const marketInfo = getWorldCupMarketInfo(firstType, game);
      const titleInfo = marketInfo
        ? {
            accessibilityLabel: marketInfo.title,
            onPress: () => onMarketInfoPress(marketInfo),
            testID: `${group.key}-moneyline-info`,
          }
        : undefined;

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
          titleInfo={titleInfo}
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
