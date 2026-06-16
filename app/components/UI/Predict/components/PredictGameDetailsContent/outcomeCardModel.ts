import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PriceQuery,
} from '../../types';
import {
  isMissingI18nLabel,
  toReadableMarketLabel,
} from '../../utils/readableMarketLabel';

export interface MoneylineCardModel {
  kind: 'moneyline';
  key: string;
  title: string;
  testID: string;
  outcomes: PredictOutcome[];
}

export interface SimpleCardModel {
  kind: 'simple';
  key: string;
  title: string;
  testID: string;
  outcome: PredictOutcome;
  sportsMarketType?: string;
}

export interface LineCardModel {
  kind: 'line';
  key: string;
  title?: string;
  testID: string;
  outcomes: PredictOutcome[];
  sportsMarketType?: string;
}

export type OutcomeCardModel =
  | MoneylineCardModel
  | SimpleCardModel
  | LineCardModel;

const I18N_PREFIX = 'predict.sports_market_types';
const O_U_PLAYER_PATTERN = /^(.+?):\s+\w+ O\/U/;
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

export const formatOutcomeCardTitle = (outcome: PredictOutcome): string => {
  const raw = outcome.groupItemTitle || outcome.title;
  if (!raw.includes('O/U')) return raw;

  const match = raw.match(O_U_PLAYER_PATTERN);
  if (match) return match[1].trim();

  const colonIdx = raw.indexOf(': ');
  if (colonIdx !== -1) return raw.slice(0, colonIdx).trim();

  return raw;
};

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
    };
  }

  return {
    kind: 'line',
    key: subgroup.key,
    title,
    testID,
    outcomes: subgroup.outcomes,
    sportsMarketType: firstOutcome.sportsMarketType,
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
      },
    ];
  }

  return group.outcomes.map(
    (outcome, index): SimpleCardModel => ({
      kind: 'simple',
      key: outcome.id,
      title: formatOutcomeCardTitle(outcome),
      testID: `${group.key}-outcome-${index}`,
      outcome,
      sportsMarketType: outcome.sportsMarketType,
    }),
  );
};

export const toPriceQuery = (
  outcome: PredictOutcome,
  outcomeTokenId: string,
): PriceQuery => ({
  marketId: outcome.marketId,
  outcomeId: outcome.id,
  outcomeTokenId,
});

export const getLineIndices = (outcomes: PredictOutcome[]): number[] =>
  outcomes
    .map((outcome, index) => (outcome.line != null ? index : -1))
    .filter((index) => index !== -1)
    .sort((a, b) => {
      const lineA = outcomes[a].line ?? 0;
      const lineB = outcomes[b].line ?? 0;
      return lineA - lineB;
    });

export const getDefaultSelectedLineIndex = (
  outcomes: PredictOutcome[],
  lineIndices: number[],
): number => {
  if (lineIndices.length === 0) {
    return 0;
  }

  return lineIndices.reduce((bestIndex, outcomeIndex, currentIndex) => {
    const bestVolume = outcomes[lineIndices[bestIndex]]?.volume ?? 0;
    const currentVolume = outcomes[outcomeIndex]?.volume ?? 0;

    return currentVolume > bestVolume ? currentIndex : bestIndex;
  }, 0);
};

export const getSelectedLineOutcome = (
  cardModel: Extract<OutcomeCardModel, { kind: 'line' }>,
  selectedLineIndex: number | undefined,
): PredictOutcome | undefined => {
  const lineIndices = getLineIndices(cardModel.outcomes);
  const defaultSelectedLineIndex = getDefaultSelectedLineIndex(
    cardModel.outcomes,
    lineIndices,
  );
  const resolvedSelectedLineIndex =
    selectedLineIndex ?? defaultSelectedLineIndex;
  const safeSelectedLineIndex =
    lineIndices[resolvedSelectedLineIndex] === undefined
      ? defaultSelectedLineIndex
      : resolvedSelectedLineIndex;

  return cardModel.outcomes[lineIndices[safeSelectedLineIndex]];
};
