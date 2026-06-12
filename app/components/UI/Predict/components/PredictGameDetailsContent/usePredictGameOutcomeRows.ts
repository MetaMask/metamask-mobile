import { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PriceQuery,
} from '../../types';
import {
  isMissingI18nLabel,
  toReadableMarketLabel,
} from '../../utils/readableMarketLabel';
import {
  formatOutcomeCardTitle,
  getDefaultSelectedLineIndex,
  type LineCardModel,
  type MoneylineCardModel,
  type OutcomeCardModel,
  type SharedPricingStrategy,
  type SimpleCardModel,
} from './PredictGameOutcomeCard';

const I18N_PREFIX = 'predict.sports_market_types';

const getTranslatedSportsMarketTypeLabel = (
  type: string,
): string | undefined => {
  const key = `${I18N_PREFIX}.${type}`;
  const label = strings(key);
  if (typeof label !== 'string' || isMissingI18nLabel(label, key)) {
    return undefined;
  }
  return label;
};

export const getSportsMarketTypeLabel = (
  type: string,
  fallbackTitle?: string,
): string =>
  getTranslatedSportsMarketTypeLabel(type) ??
  fallbackTitle ??
  toReadableMarketLabel(type);

const collectOutcomeTokenIds = (outcomes: PredictOutcome[]): string[] =>
  outcomes.flatMap((outcome) => outcome.tokens.map((token) => token.id));

const buildSharedPricingStrategy = (
  outcomes: PredictOutcome[],
): SharedPricingStrategy => ({
  kind: 'shared',
  tokenIds: [...new Set(collectOutcomeTokenIds(outcomes))],
});

const buildPriceQueries = (outcomes: PredictOutcome[]): PriceQuery[] =>
  outcomes.flatMap((outcome) =>
    outcome.tokens.map((token) => ({
      marketId: outcome.marketId,
      outcomeId: outcome.id,
      outcomeTokenId: token.id,
    })),
  );

const collectPrimaryOutcomeTokens = (
  outcomes: PredictOutcome[],
): PredictOutcomeToken[] =>
  outcomes
    .map((outcome) => outcome.tokens[0])
    .filter((token): token is PredictOutcomeToken => Boolean(token));

const getCardTitle = (
  card: Pick<PredictOutcomeGroup, 'key' | 'title' | 'outcomes'>,
  fallbackType?: string,
): string | undefined => {
  if (card.title) {
    return card.title;
  }

  const firstOutcome = card.outcomes[0];
  const marketType = fallbackType ?? firstOutcome?.sportsMarketType ?? card.key;

  if (!marketType) {
    return firstOutcome ? formatOutcomeCardTitle(firstOutcome) : undefined;
  }

  return getSportsMarketTypeLabel(
    marketType,
    firstOutcome ? formatOutcomeCardTitle(firstOutcome) : card.key,
  );
};

const buildSubgroupCardModel = (
  subgroup: PredictOutcomeGroup,
  groupKey: string,
): OutcomeCardModel | null => {
  const testID = `${groupKey}-${subgroup.key}`;
  const firstOutcome = subgroup.outcomes[0];
  if (!firstOutcome) {
    return null;
  }

  const title = getCardTitle(subgroup, subgroup.key);
  const translatedTitle = getTranslatedSportsMarketTypeLabel(subgroup.key);

  if (
    isMoneylineLikeMarketType(firstOutcome.sportsMarketType) &&
    subgroup.outcomes.length > 1
  ) {
    return {
      kind: 'moneyline',
      key: subgroup.key,
      title: title ?? subgroup.key,
      testID,
      outcomes: subgroup.outcomes,
      pricing: buildSharedPricingStrategy(subgroup.outcomes),
    };
  }

  if (subgroup.outcomes.length <= 1) {
    return {
      kind: 'simple',
      key: firstOutcome.id,
      title: title ?? formatOutcomeCardTitle(firstOutcome),
      testID,
      outcome: firstOutcome,
      sportsMarketType: firstOutcome.sportsMarketType,
      pricing: buildSharedPricingStrategy([firstOutcome]),
    };
  }

  return {
    kind: 'line',
    key: subgroup.key,
    title: subgroup.title ?? translatedTitle,
    testID,
    outcomes: subgroup.outcomes,
    sportsMarketType: firstOutcome.sportsMarketType,
    pricing: { kind: 'selected-line' },
  };
};

export const buildOutcomeCardModels = (
  group: PredictOutcomeGroup,
): OutcomeCardModel[] => {
  if (group.subgroups && group.subgroups.length > 0) {
    return group.subgroups
      .map((subgroup) => buildSubgroupCardModel(subgroup, group.key))
      .filter((cardModel): cardModel is OutcomeCardModel => Boolean(cardModel));
  }

  const firstOutcome = group.outcomes[0];
  const firstType = firstOutcome?.sportsMarketType;
  if (
    firstType &&
    isMoneylineLikeMarketType(firstType) &&
    group.outcomes.length > 1
  ) {
    return [
      {
        kind: 'moneyline',
        key: `${group.key}-moneyline`,
        title:
          getCardTitle(
            {
              key: firstType,
              outcomes: group.outcomes,
            },
            firstType,
          ) ?? firstType,
        testID: `${group.key}-moneyline`,
        outcomes: group.outcomes,
        pricing: buildSharedPricingStrategy(group.outcomes),
      },
    ];
  }

  return group.outcomes.map(
    (outcome, index): SimpleCardModel | MoneylineCardModel | LineCardModel => ({
      kind: 'simple',
      key: outcome.id,
      title: formatOutcomeCardTitle(outcome),
      testID: `${group.key}-outcome-${index}`,
      outcome,
      sportsMarketType: outcome.sportsMarketType,
      pricing: buildSharedPricingStrategy([outcome]),
    }),
  );
};

export interface ResolvedCardPricing {
  key: string;
  tokens: PredictOutcomeToken[];
  tokenIds: string[];
  queries: PriceQuery[];
}

const resolveSelectedLineOutcome = (
  cardModel: LineCardModel,
  selectedLineIndex?: number,
): PredictOutcome | undefined => {
  const lineIndices = cardModel.outcomes
    .map((outcome, index) => (outcome.line != null ? index : -1))
    .filter((index) => index !== -1)
    .sort((a, b) => {
      const lineA = cardModel.outcomes[a].line ?? 0;
      const lineB = cardModel.outcomes[b].line ?? 0;
      return lineA - lineB;
    });

  if (lineIndices.length === 0) {
    return cardModel.outcomes[0];
  }

  const defaultSelectedIdx = getDefaultSelectedLineIndex(
    cardModel.outcomes,
    lineIndices,
  );
  const resolvedSelectedIdx = selectedLineIndex ?? defaultSelectedIdx;
  const safeSelectedIdx =
    lineIndices[resolvedSelectedIdx] !== undefined
      ? resolvedSelectedIdx
      : defaultSelectedIdx;

  return (
    cardModel.outcomes[lineIndices[safeSelectedIdx]] ?? cardModel.outcomes[0]
  );
};

export const resolveCardPricing = (
  cardModel: OutcomeCardModel,
  selectedLineIndex?: number,
): ResolvedCardPricing => {
  switch (cardModel.kind) {
    case 'simple':
      return {
        key: cardModel.key,
        tokens: cardModel.outcome.tokens,
        tokenIds: cardModel.outcome.tokens.map((token) => token.id),
        queries: buildPriceQueries([cardModel.outcome]),
      };
    case 'moneyline': {
      const tokens = collectPrimaryOutcomeTokens(cardModel.outcomes);
      return {
        key: cardModel.key,
        tokens,
        tokenIds: tokens.map((token) => token.id),
        queries: cardModel.outcomes
          .filter((outcome) => outcome.tokens[0] !== undefined)
          .map((outcome) => ({
            marketId: outcome.marketId,
            outcomeId: outcome.id,
            outcomeTokenId: outcome.tokens[0].id,
          })),
      };
    }
    case 'line': {
      const selectedOutcome = resolveSelectedLineOutcome(
        cardModel,
        selectedLineIndex,
      );
      const tokens = selectedOutcome?.tokens ?? [];
      return {
        key: cardModel.key,
        tokens,
        tokenIds: tokens.map((token) => token.id),
        queries: selectedOutcome ? buildPriceQueries([selectedOutcome]) : [],
      };
    }
  }
};

export const usePredictGameOutcomeRows = (group?: PredictOutcomeGroup) => {
  const cardModels = useMemo(
    () => (group ? buildOutcomeCardModels(group) : []),
    [group],
  );

  return {
    cardModels,
  };
};
