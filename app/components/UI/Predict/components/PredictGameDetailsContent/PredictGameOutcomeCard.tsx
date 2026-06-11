import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
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

export type GetLivePrice = ReturnType<typeof useLiveMarketPrices>['getPrice'];

export interface SharedPricingStrategy {
  kind: 'shared';
  tokenIds: string[];
}

export interface SelectedLinePricingStrategy {
  kind: 'selected-line';
}

export interface MoneylineCardModel {
  kind: 'moneyline';
  key: string;
  title: string;
  testID: string;
  outcomes: PredictOutcome[];
  pricing: SharedPricingStrategy;
}

export interface SimpleCardModel {
  kind: 'simple';
  key: string;
  title: string;
  testID: string;
  outcome: PredictOutcome;
  sportsMarketType?: string;
  pricing: SharedPricingStrategy;
}

export interface LineCardModel {
  kind: 'line';
  key: string;
  title?: string;
  testID: string;
  outcomes: PredictOutcome[];
  sportsMarketType?: string;
  pricing: SelectedLinePricingStrategy;
}

export type OutcomeCardModel =
  | MoneylineCardModel
  | SimpleCardModel
  | LineCardModel;

export interface PredictGameOutcomeCardProps {
  cardModel: OutcomeCardModel;
  onBuyPress: BuyHandler;
  game?: PredictMarketGame;
  getPrice: GetLivePrice;
}

const O_U_PLAYER_PATTERN = /^(.+?):\s+\w+ O\/U/;

export const formatOutcomeCardTitle = (outcome: PredictOutcome): string => {
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
  }: {
    outcomes: PredictOutcome[];
    title?: string;
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

    const initialSelectedIdx = useMemo(() => {
      if (lineIndices.length === 0) {
        return 0;
      }

      return lineIndices.reduce((bestIdx, outcomeIdx, currentIdx) => {
        const bestVolume = outcomes[lineIndices[bestIdx]]?.volume ?? 0;
        const currentVolume = outcomes[outcomeIdx]?.volume ?? 0;

        return currentVolume > bestVolume ? currentIdx : bestIdx;
      }, 0);
    }, [lineIndices, outcomes]);

    const [selectedIdx, setSelectedIdx] = useState(initialSelectedIdx);

    useEffect(() => {
      setSelectedIdx(initialSelectedIdx);
    }, [initialSelectedIdx]);

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
    const selectedTokenIds = useMemo(
      () =>
        selectedOutcome ? selectedOutcome.tokens.map((token) => token.id) : [],
      [selectedOutcome],
    );
    const { getPrice: getSelectedLinePrice } =
      useLiveMarketPrices(selectedTokenIds);

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
          getSelectedLinePrice,
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
  ({ cardModel, onBuyPress, game, getPrice }: PredictGameOutcomeCardProps) => {
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
            sportsMarketType={cardModel.sportsMarketType}
            testID={cardModel.testID}
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
