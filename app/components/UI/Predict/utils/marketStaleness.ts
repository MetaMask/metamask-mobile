import {
  PredictMarketStatus,
  Recurrence,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeGroup,
} from '../types';

export const PREDICT_DEAD_OUTCOME_HIGH_THRESHOLD = 0.95;
export const PREDICT_DEAD_OUTCOME_LOW_THRESHOLD = 0.05;
export const PREDICT_MIN_STALENESS_PENALTY = 0.1;
export const PREDICT_LAST_HOUR_TIME_PENALTY = 0.5;

const HOUR_IN_MS = 60 * 60 * 1000;

export interface PredictMarketStalenessOptions {
  now?: Date | number;
}

const getNowMs = (options?: PredictMarketStalenessOptions): number => {
  if (options?.now instanceof Date) {
    return options.now.getTime();
  }

  if (typeof options?.now === 'number') {
    return options.now;
  }

  return Date.now();
};

const getOutcomeProbability = (outcome: PredictOutcome): number | null => {
  const probability = outcome.tokens?.[0]?.price;

  if (typeof probability !== 'number' || !Number.isFinite(probability)) {
    return null;
  }

  return probability;
};

export const isPredictOutcomeDead = (outcome: PredictOutcome): boolean => {
  const probability = getOutcomeProbability(outcome);

  if (probability === null) {
    return true;
  }

  return (
    probability >= PREDICT_DEAD_OUTCOME_HIGH_THRESHOLD ||
    probability <= PREDICT_DEAD_OUTCOME_LOW_THRESHOLD
  );
};

const isPredictOutcomeDisplayable = (outcome: PredictOutcome): boolean =>
  outcome.status === PredictMarketStatus.OPEN && !isPredictOutcomeDead(outcome);

const filterOutcomeGroup = (
  group: PredictOutcomeGroup,
  visibleOutcomeIds: Set<string>,
): PredictOutcomeGroup | null => {
  const outcomes = group.outcomes.filter((outcome) =>
    visibleOutcomeIds.has(outcome.id),
  );
  const subgroups = group.subgroups
    ?.map((subgroup) => filterOutcomeGroup(subgroup, visibleOutcomeIds))
    .filter((subgroup): subgroup is PredictOutcomeGroup => Boolean(subgroup));

  if (outcomes.length === 0 && (!subgroups || subgroups.length === 0)) {
    return null;
  }

  return {
    ...group,
    outcomes,
    ...(subgroups && { subgroups }),
  };
};

export const filterVisibleMarketOutcomes = (
  market: PredictMarket,
): PredictMarket | null => {
  const outcomes = market.outcomes.filter(isPredictOutcomeDisplayable);

  if (outcomes.length === 0) {
    return null;
  }

  const visibleOutcomeIds = new Set(outcomes.map((outcome) => outcome.id));
  const outcomeGroups = market.outcomeGroups
    ?.map((group) => filterOutcomeGroup(group, visibleOutcomeIds))
    .filter((group): group is PredictOutcomeGroup => Boolean(group));

  return {
    ...market,
    outcomes,
    ...(outcomeGroups && outcomeGroups.length > 0 ? { outcomeGroups } : {}),
  };
};

const isDailyMarket = (market: PredictMarket): boolean =>
  market.recurrence === Recurrence.DAILY;

const isGameMarket = (market: PredictMarket): boolean => Boolean(market.game);

const getHoursUntilEndDate = (
  market: PredictMarket,
  options?: PredictMarketStalenessOptions,
): number | null => {
  if (!market.endDate) {
    return null;
  }

  const endDateMs = Date.parse(market.endDate);
  if (!Number.isFinite(endDateMs)) {
    return null;
  }

  return (endDateMs - getNowMs(options)) / HOUR_IN_MS;
};

export const isPredictMarketExpiredByTime = (
  market: PredictMarket,
  options?: PredictMarketStalenessOptions,
): boolean => {
  if (market.game?.status === 'ended') {
    return true;
  }

  if (!isDailyMarket(market)) {
    return false;
  }

  const hoursUntilEndDate = getHoursUntilEndDate(market, options);
  return hoursUntilEndDate !== null && hoursUntilEndDate <= 0;
};

export const getPredictMarketTimePenalty = (
  market: PredictMarket,
  options?: PredictMarketStalenessOptions,
): number => {
  if (!isDailyMarket(market) && !isGameMarket(market)) {
    return 1;
  }

  const hoursUntilEndDate = getHoursUntilEndDate(market, options);
  if (hoursUntilEndDate === null) {
    return 1;
  }

  return hoursUntilEndDate > 0 && hoursUntilEndDate <= 1
    ? PREDICT_LAST_HOUR_TIME_PENALTY
    : 1;
};

const getMaxOutcomeProbability = (market: PredictMarket): number | null => {
  const probabilities = market.outcomes
    .map(getOutcomeProbability)
    .filter((probability): probability is number => probability !== null);

  if (probabilities.length === 0) {
    return null;
  }

  return Math.max(...probabilities);
};

export const getPredictMarketProbabilityPenalty = (
  market: PredictMarket,
): number => {
  const maxProbability = getMaxOutcomeProbability(market);

  if (
    maxProbability === null ||
    maxProbability <= PREDICT_DEAD_OUTCOME_HIGH_THRESHOLD
  ) {
    return 1;
  }

  return Math.max(
    PREDICT_MIN_STALENESS_PENALTY,
    1 - (maxProbability - PREDICT_DEAD_OUTCOME_HIGH_THRESHOLD) * 10,
  );
};

const getPredictMarketStalenessPenalty = (
  market: PredictMarket,
  options?: PredictMarketStalenessOptions,
): number => {
  if (market.isHighlighted || isGameMarket(market)) {
    return 1;
  }

  return (
    getPredictMarketProbabilityPenalty(market) *
    getPredictMarketTimePenalty(market, options)
  );
};

export const getVisiblePredictMarket = (
  market: PredictMarket,
  options?: PredictMarketStalenessOptions,
): PredictMarket | null => {
  if (market.status !== PredictMarketStatus.OPEN) {
    return null;
  }

  if (market.isHighlighted) {
    return market;
  }

  if (isPredictMarketExpiredByTime(market, options)) {
    return null;
  }

  if (isGameMarket(market)) {
    return market;
  }

  return filterVisibleMarketOutcomes(market);
};

export const getVisiblePredictMarkets = (
  markets: PredictMarket[],
  options?: PredictMarketStalenessOptions,
): PredictMarket[] => {
  const visibleMarketEntries = markets
    .map((market, index) => ({
      originalMarket: market,
      visibleMarket: getVisiblePredictMarket(market, options),
      index,
    }))
    .filter(
      (
        entry,
      ): entry is {
        originalMarket: PredictMarket;
        visibleMarket: PredictMarket;
        index: number;
      } => Boolean(entry.visibleMarket),
    );

  const highlightedMarkets = visibleMarketEntries
    .filter(({ visibleMarket }) => visibleMarket.isHighlighted)
    .map(({ visibleMarket }) => visibleMarket);

  const rankedMarkets = visibleMarketEntries
    .filter(({ visibleMarket }) => !visibleMarket.isHighlighted)
    .map(({ originalMarket, visibleMarket, index }) => ({
      market: visibleMarket,
      index,
      score:
        (markets.length - index) *
        getPredictMarketStalenessPenalty(originalMarket, options),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ market }) => market);

  return [...highlightedMarkets, ...rankedMarkets];
};
