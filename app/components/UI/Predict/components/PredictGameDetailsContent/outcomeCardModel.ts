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
  buildPriceQueriesFromOutcomes,
  collectOutcomeTokens,
} from '../../utils/pricingQueries';
import { resolveSelectedLineOutcome } from '../../utils/outcomeLines';

const I18N_PREFIX = 'predict.sports_market_types';
const O_U_PLAYER_PATTERN = /^(.+?):\s+\w+ O\/U/;

export type BuyHandler = (
  outcome: PredictOutcome,
  token: PredictOutcomeToken,
) => void;

export type GetTokenPrice = (token: PredictOutcomeToken) => number;

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

export interface ResolvedCardPricing {
  key: string;
  tokens: PredictOutcomeToken[];
  tokenIds: string[];
  queries: PriceQuery[];
}

export const formatOutcomeCardTitle = (outcome: PredictOutcome): string => {
  const raw = outcome.groupItemTitle || outcome.title;
  if (!raw.includes('O/U')) return raw;

  const match = raw.match(O_U_PLAYER_PATTERN);
  if (match) return match[1].trim();

  const colonIdx = raw.indexOf(': ');
  if (colonIdx !== -1) return raw.slice(0, colonIdx).trim();

  return raw;
};

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

const buildSharedPricingStrategy = (
  outcomes: PredictOutcome[],
): SharedPricingStrategy => ({
  kind: 'shared',
  tokenIds: [
    ...new Set(collectOutcomeTokens(outcomes).map((token) => token.id)),
  ],
});

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
        queries: buildPriceQueriesFromOutcomes([cardModel.outcome]),
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
        cardModel.outcomes,
        selectedLineIndex,
      );
      const tokens = selectedOutcome?.tokens ?? [];
      return {
        key: cardModel.key,
        tokens,
        tokenIds: tokens.map((token) => token.id),
        queries: selectedOutcome
          ? buildPriceQueriesFromOutcomes([selectedOutcome])
          : [],
      };
    }
  }
};

export const collectCardModelTokenIds = (
  cardModels: OutcomeCardModel[],
): string[] => {
  const tokenIds = cardModels.flatMap((cardModel) => {
    switch (cardModel.kind) {
      case 'simple':
        return cardModel.outcome.tokens.map((token) => token.id);
      case 'moneyline':
      case 'line':
        return cardModel.outcomes.flatMap((outcome) =>
          outcome.tokens.map((token) => token.id),
        );
      default:
        return [];
    }
  });

  return [...new Set(tokenIds)];
};
