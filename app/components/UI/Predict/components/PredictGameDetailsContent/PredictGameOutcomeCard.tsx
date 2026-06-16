import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
  PriceUpdate,
} from '../../types';
import {
  formatOutcomeCardTitle,
  getDefaultSelectedLineIndex,
  getLineIndices,
  type OutcomeCardModel,
} from './outcomeCardModel';
import type { PredictBetButtonVariant } from '../PredictActionButtons/PredictActionButtons.types';
import PredictSportOutcomeCard, {
  type PredictSportOutcomeButton,
} from '../PredictSportOutcomeCard';
import { formatVolume } from '../../utils/format';
import { isValidPrice } from '../../utils/prices';
import { isMoneylineLikeMarketType } from '../../constants/sports';

export type BuyHandler = (
  outcome: PredictOutcome,
  token: PredictOutcomeToken,
) => void;

export type GetLivePrice = (tokenId: string) => PriceUpdate | undefined;

export interface PredictGameOutcomeCardProps {
  cardModel: OutcomeCardModel;
  onBuyPress: BuyHandler;
  game?: PredictMarketGame;
  getPrice: GetLivePrice;
  selectedLineIndex?: number;
  onSelectedLineIndexChange?: (selectedIndex: number) => void;
}

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
  getPrice?: GetLivePrice,
): PredictSportOutcomeButton[] => {
  const moneyline = isMoneylineLikeMarketType(sportsMarketType);
  return outcome.tokens.map((token, index) => {
    const liveBestAsk = getPrice?.(token.id)?.bestAsk;
    const price = isValidPrice(liveBestAsk) ? liveBestAsk : token.price;

    return {
      label: token.shortTitle ?? token.title,
      price: Math.round(price * 100),
      onPress: () => onBuyPress(outcome, token),
      variant: getButtonVariant(index, outcome.tokens.length, moneyline),
      teamColor: moneyline
        ? getTeamColor(token.shortTitle ?? token.title, game)
        : undefined,
    };
  });
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
    getPrice,
    testID,
  }: {
    outcome: PredictOutcome;
    title: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    getPrice?: GetLivePrice;
    testID: string;
  }) => (
    <PredictSportOutcomeCard
      title={title}
      subtitle={buildSubtitle(outcome)}
      buttons={buildButtons(
        outcome,
        onBuyPress,
        game,
        sportsMarketType,
        getPrice,
      )}
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
    getPrice,
    selectedLineIndex,
    onSelectedLineIndexChange,
  }: {
    outcomes: PredictOutcome[];
    title?: string;
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    sportsMarketType?: string;
    testID: string;
    getPrice?: GetLivePrice;
    selectedLineIndex?: number;
    onSelectedLineIndexChange?: (selectedIndex: number) => void;
  }) => {
    const lineIndices = useMemo(() => getLineIndices(outcomes), [outcomes]);

    const lines = useMemo(
      () => lineIndices.map((i) => Math.abs(outcomes[i].line ?? 0)),
      [lineIndices, outcomes],
    );

    const initialSelectedIdx = useMemo(
      () => getDefaultSelectedLineIndex(outcomes, lineIndices),
      [outcomes, lineIndices],
    );

    const [uncontrolledSelectedIdx, setUncontrolledSelectedIdx] =
      useState(initialSelectedIdx);
    const [animateLineSelection, setAnimateLineSelection] = useState(false);
    const pendingUserLineSelectionRef = React.useRef(false);

    useEffect(() => {
      if (selectedLineIndex === undefined) {
        setUncontrolledSelectedIdx(initialSelectedIdx);
      }
      if (pendingUserLineSelectionRef.current) {
        pendingUserLineSelectionRef.current = false;
        return;
      }
      setAnimateLineSelection(false);
    }, [initialSelectedIdx, selectedLineIndex]);

    const resolvedSelectedIdx =
      selectedLineIndex ?? uncontrolledSelectedIdx ?? initialSelectedIdx;
    const safeSelectedIdx =
      lineIndices[resolvedSelectedIdx] !== undefined
        ? resolvedSelectedIdx
        : initialSelectedIdx;

    const handleSelectLine = useCallback(
      (_line: number, indexInLines: number) => {
        pendingUserLineSelectionRef.current = true;
        setAnimateLineSelection(true);
        if (selectedLineIndex === undefined) {
          setUncontrolledSelectedIdx(indexInLines);
        }
        onSelectedLineIndexChange?.(indexInLines);
      },
      [onSelectedLineIndexChange, selectedLineIndex],
    );

    const selectedOutcome = useMemo(
      () => outcomes[lineIndices[safeSelectedIdx]] ?? outcomes[0],
      [outcomes, lineIndices, safeSelectedIdx],
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
          getPrice,
        )}
        lines={lines}
        selectedLine={lines[safeSelectedIdx]}
        selectedIndex={safeSelectedIdx}
        animateLineSelection={animateLineSelection}
        onSelectLine={handleSelectLine}
        testID={testID}
      />
    );
  },
);

LineOutcomeCard.displayName = 'LineOutcomeCard';

// The neutral pick of a 3-way market, like Draw or Neither, should stay in the
// middle so the card can render it with neutral styling.
const isNeutralOutcome = (outcome: PredictOutcome): boolean => {
  const title = outcome.groupItemTitle?.toLowerCase() ?? '';
  return title.startsWith('draw') || title.startsWith('neither');
};

const sortMoneylineOutcomes = (
  outcomes: PredictOutcome[],
  game?: PredictMarketGame,
): PredictOutcome[] => {
  const ordered = ((): PredictOutcome[] => {
    const hasThresholds = outcomes.some((o) => o.groupItemThreshold != null);
    if (hasThresholds) {
      return [...outcomes].sort(
        (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
      );
    }

    const neutral = outcomes.find(isNeutralOutcome);
    const others = outcomes.filter((o) => !isNeutralOutcome(o));
    if (!neutral || others.length < 2) {
      return [...outcomes];
    }

    if (game) {
      const homeAbbr = game.homeTeam.abbreviation;
      const home = others.find((o) => o.tokens[0]?.shortTitle === homeAbbr);
      const away = others.find((o) => o !== home);
      if (home && away) {
        return [home, neutral, away];
      }
    }

    const sorted = [...others].sort((a, b) =>
      (a.groupItemTitle ?? '').localeCompare(b.groupItemTitle ?? ''),
    );
    return [sorted[0], neutral, ...sorted.slice(1)];
  })();

  if (ordered.length === 3) {
    const neutralIdx = ordered.findIndex(isNeutralOutcome);
    if (neutralIdx === 0 || neutralIdx === 2) {
      const neutral = ordered[neutralIdx];
      const rest = ordered.filter((_, i) => i !== neutralIdx);
      return [rest[0], neutral, rest[1]];
    }
  }

  return ordered;
};

const buildMoneylineButtons = (
  outcomes: PredictOutcome[],
  onBuyPress: BuyHandler,
  game?: PredictMarketGame,
  getPrice?: GetLivePrice,
): PredictSportOutcomeButton[] => {
  const sortedWithTokens = sortMoneylineOutcomes(outcomes, game).filter(
    (outcome) => outcome.tokens[0] !== undefined,
  );

  return sortedWithTokens.map((outcome, i) => {
    const yesToken = outcome.tokens[0];
    const liveBestAsk = getPrice?.(yesToken.id)?.bestAsk;
    const price = isValidPrice(liveBestAsk) ? liveBestAsk : yesToken.price;

    return {
      label: yesToken.shortTitle ?? yesToken.title,
      price: Math.round(price * 100),
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
    getPrice,
    testID,
  }: {
    outcomes: PredictOutcome[];
    onBuyPress: BuyHandler;
    game?: PredictMarketGame;
    title: string;
    getPrice?: GetLivePrice;
    testID: string;
  }) => {
    const subtitle = useMemo(
      () => buildMoneylineSubtitle(outcomes),
      [outcomes],
    );
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

const PredictGameOutcomeCard = memo(
  ({
    cardModel,
    onBuyPress,
    game,
    getPrice,
    selectedLineIndex,
    onSelectedLineIndexChange,
  }: PredictGameOutcomeCardProps) => {
    switch (cardModel.kind) {
      case 'moneyline':
        return (
          <MoneylineCard
            outcomes={cardModel.outcomes}
            onBuyPress={onBuyPress}
            game={game}
            getPrice={getPrice}
            title={cardModel.title}
            testID={cardModel.testID}
          />
        );
      case 'line':
        return (
          <LineOutcomeCard
            outcomes={cardModel.outcomes}
            title={cardModel.title}
            onBuyPress={onBuyPress}
            game={game}
            getPrice={getPrice}
            sportsMarketType={cardModel.sportsMarketType}
            testID={cardModel.testID}
            selectedLineIndex={selectedLineIndex}
            onSelectedLineIndexChange={onSelectedLineIndexChange}
          />
        );
      case 'simple':
        return (
          <SimpleOutcomeCard
            outcome={cardModel.outcome}
            title={cardModel.title}
            onBuyPress={onBuyPress}
            game={game}
            getPrice={getPrice}
            sportsMarketType={cardModel.sportsMarketType}
            testID={cardModel.testID}
          />
        );
    }
  },
);

PredictGameOutcomeCard.displayName = 'PredictGameOutcomeCard';

export default PredictGameOutcomeCard;
