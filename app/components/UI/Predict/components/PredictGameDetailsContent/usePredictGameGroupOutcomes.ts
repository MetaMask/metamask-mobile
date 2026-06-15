import { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  type PriceQuery,
  type PredictOutcome,
  type PredictOutcomeGroup,
} from '../../types';
import {
  isMissingI18nLabel,
  toReadableMarketLabel,
} from '../../utils/readableMarketLabel';
import {
  formatOutcomeCardTitle,
  type LineCardModel,
  type MoneylineCardModel,
  type OutcomeCardModel,
  type SharedPricingStrategy,
  type SimpleCardModel,
} from './PredictGameOutcomeCard';

interface UsePredictGameGroupOutcomesParams {
  group?: PredictOutcomeGroup;
}

interface UsePredictGameGroupOutcomesResult {
  openCardModels: OutcomeCardModel[];
  closedOutcomes: PredictOutcome[];
  activeGroupTokenIds: string[];
  activeGroupPriceQueries: PriceQuery[];
  showResolvedSection: boolean;
  hasPartialResolution: boolean;
}

const I18N_PREFIX = 'predict.sports_market_types';
const loggedMissingTranslationKeys = new Set<string>();

const logMissingSportsMarketTypeTranslation = (
  key: string,
  type: string,
): void => {
  if (loggedMissingTranslationKeys.has(key)) return;

  loggedMissingTranslationKeys.add(key);
  const message = `Missing Predict sports market type translation: ${key}`;
  Logger.error(new Error(message), {
    message,
    context: { key, type },
  });
};

const getTranslatedSportsMarketTypeLabel = (
  type: string,
): string | undefined => {
  const key = `${I18N_PREFIX}.${type}`;
  const label = strings(key);
  if (typeof label !== 'string' || isMissingI18nLabel(label, key)) {
    logMissingSportsMarketTypeTranslation(key, type);
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

const collectOutcomeTokenIds = (outcomes: PredictOutcome[]): string[] => [
  ...new Set(
    outcomes.flatMap((outcome) => outcome.tokens.map((token) => token.id)),
  ),
];

const buildSharedPricingStrategy = (
  outcomes: PredictOutcome[],
): SharedPricingStrategy => ({
  kind: 'shared',
  tokenIds: collectOutcomeTokenIds(outcomes),
});

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
    title,
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

const collectCardModelTokenIds = (cardModels: OutcomeCardModel[]): string[] => [
  ...new Set(
    cardModels.flatMap((cardModel) =>
      cardModel.pricing.kind === 'shared'
        ? cardModel.pricing.tokenIds
        : 'outcomes' in cardModel
          ? cardModel.outcomes.flatMap((outcome) =>
              outcome.tokens.map((token) => token.id),
            )
          : [],
    ),
  ),
];

const toPriceQuery = (
  outcome: PredictOutcome,
  outcomeTokenId: string,
): PriceQuery => ({
  marketId: outcome.marketId,
  outcomeId: outcome.id,
  outcomeTokenId,
  sportsMarketType: outcome.sportsMarketType,
});

const collectCardModelPriceQueries = (
  cardModels: OutcomeCardModel[],
): PriceQuery[] => {
  const queriesByTokenId = new Map<string, PriceQuery>();

  cardModels
    .flatMap((cardModel) => {
      if (cardModel.kind === 'simple') {
        return cardModel.outcome.tokens.map((token) =>
          toPriceQuery(cardModel.outcome, token.id),
        );
      }

      if (cardModel.kind === 'moneyline') {
        return cardModel.outcomes.flatMap((outcome) => {
          const token = outcome.tokens[0];
          return token ? [toPriceQuery(outcome, token.id)] : [];
        });
      }

      return cardModel.outcomes.flatMap((outcome) =>
        outcome.tokens.map((token) => toPriceQuery(outcome, token.id)),
      );
    })
    .forEach((query) => {
      if (!queriesByTokenId.has(query.outcomeTokenId)) {
        queriesByTokenId.set(query.outcomeTokenId, query);
      }
    });

  return [...queriesByTokenId.values()];
};

const isOpenOutcome = (outcome: PredictOutcome): boolean =>
  outcome.status === OPEN_PREDICT_OUTCOME_STATUS &&
  outcome.resolutionStatus !== 'resolved';

const isResolvedOutcome = (outcome: PredictOutcome): boolean =>
  outcome.status === 'closed' ||
  outcome.status === 'resolved' ||
  outcome.resolutionStatus === 'resolved';

const splitOutcomeGroupByStatus = (
  group: PredictOutcomeGroup,
): {
  openGroup: PredictOutcomeGroup | null;
  closedOutcomes: PredictOutcome[];
} => {
  if (group.subgroups?.length) {
    const subgroupResults = group.subgroups.map(splitOutcomeGroupByStatus);
    const openSubgroups = subgroupResults
      .map((result) => result.openGroup)
      .filter((subgroup): subgroup is PredictOutcomeGroup => Boolean(subgroup));
    const closedOutcomes = subgroupResults.flatMap(
      (result) => result.closedOutcomes,
    );

    return {
      openGroup:
        openSubgroups.length > 0
          ? { ...group, outcomes: [], subgroups: openSubgroups }
          : null,
      closedOutcomes,
    };
  }

  const openOutcomes = group.outcomes.filter(isOpenOutcome);
  const closedOutcomes = group.outcomes.filter(isResolvedOutcome);

  return {
    openGroup:
      openOutcomes.length > 0 ? { ...group, outcomes: openOutcomes } : null,
    closedOutcomes,
  };
};

export const usePredictGameGroupOutcomes = ({
  group,
}: UsePredictGameGroupOutcomesParams): UsePredictGameGroupOutcomesResult => {
  const { openGroup, closedOutcomes } = useMemo(
    () =>
      group
        ? splitOutcomeGroupByStatus(group)
        : { openGroup: null, closedOutcomes: [] },
    [group],
  );

  const openCardModels = useMemo(
    () => (openGroup ? buildOutcomeCardModels(openGroup) : []),
    [openGroup],
  );

  const activeGroupTokenIds = useMemo(
    () => collectCardModelTokenIds(openCardModels),
    [openCardModels],
  );
  const activeGroupPriceQueries = useMemo(
    () => collectCardModelPriceQueries(openCardModels),
    [openCardModels],
  );

  return {
    openCardModels,
    closedOutcomes,
    activeGroupTokenIds,
    activeGroupPriceQueries,
    showResolvedSection: closedOutcomes.length > 0,
    hasPartialResolution:
      closedOutcomes.length > 0 && openCardModels.length > 0,
  };
};
