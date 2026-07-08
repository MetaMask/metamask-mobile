import type { PredictOutcome, PredictOutcomeGroup } from '../../types';
import {
  DEFAULT_GROUP_KEY,
  GROUP_ORDER,
  SPORTS_MARKET_TYPE_PRIORITIES,
  SPORTS_MARKET_TYPE_TO_GROUP,
  SUPPORTED_SPORTS_MARKET_TYPES,
} from './constants';
import type { PolymarketApiMarket } from './types';

const DISPLAYED_SPREAD_LINE_PATTERN = /([+-]\d+(?:\.\d+)?)$/;

export const normalizeSportsMarketType = (type: string): string => {
  const lower = type.toLowerCase();
  if (lower.startsWith('first_half_')) {
    return lower.slice('first_half_'.length);
  }
  return lower;
};

const getSportsMarketTypePriority = (type: string): number =>
  SPORTS_MARKET_TYPE_PRIORITIES[type.toLowerCase()] ?? 3;

const isSpreadOutcomeType = (sportsMarketType?: string): boolean =>
  sportsMarketType?.toLowerCase().includes('spread') ?? false;

export const isLineOutcomeType = (sportsMarketType?: string): boolean => {
  const normalizedType = normalizeSportsMarketType(sportsMarketType ?? '');
  return isSpreadOutcomeType(normalizedType) || normalizedType === 'totals';
};

const getDisplayedSpreadLine = (
  outcome: PredictOutcome,
): number | undefined => {
  const label = outcome.tokens[0]?.shortTitle ?? outcome.tokens[0]?.title;
  const match = label?.trim().match(DISPLAYED_SPREAD_LINE_PATTERN);
  if (!match) return undefined;

  const line = Number(match[1]);
  return Number.isFinite(line) ? line : undefined;
};

const sortLineOutcomesForDisplay = (
  outcomes: PredictOutcome[],
  sportsMarketType?: string,
): PredictOutcome[] => {
  const hasLineOutcomes = outcomes.some((outcome) => outcome.line != null);
  if (!hasLineOutcomes) return outcomes;

  const shouldSortByDisplayedSpreadLine =
    isSpreadOutcomeType(sportsMarketType) &&
    outcomes.every(
      (outcome) =>
        outcome.line == null || getDisplayedSpreadLine(outcome) !== undefined,
    );

  const firstLineOutcome = outcomes.find((outcome) => outcome.line != null);
  const firstDisplayedSpreadLine =
    shouldSortByDisplayedSpreadLine && firstLineOutcome
      ? getDisplayedSpreadLine(firstLineOutcome)
      : undefined;
  const sortSpreadAscending =
    firstDisplayedSpreadLine !== undefined && firstDisplayedSpreadLine > 0;

  return [...outcomes].sort((a, b) => {
    if (shouldSortByDisplayedSpreadLine) {
      const lineA = getDisplayedSpreadLine(a) ?? 0;
      const lineB = getDisplayedSpreadLine(b) ?? 0;
      return sortSpreadAscending ? lineA - lineB : lineB - lineA;
    }

    return (a.line ?? 0) - (b.line ?? 0);
  });
};

export const normalizeEnabledSportsMarketTypes = (value: unknown): string[] => {
  const rawTypes = Array.isArray(value)
    ? value
    : [...SUPPORTED_SPORTS_MARKET_TYPES];

  return [
    ...new Set(rawTypes.map((type) => String(type).toLowerCase())),
  ].filter((type) => SUPPORTED_SPORTS_MARKET_TYPES.has(type));
};

export const filterGroupableOutcomes = (
  outcomes: PredictOutcome[],
  enabledSportsMarketTypes: string[],
): PredictOutcome[] => {
  const enabledSportsMarketTypeSet = new Set(enabledSportsMarketTypes);

  return outcomes.filter((outcome) => {
    if (!outcome.sportsMarketType) return false;

    return enabledSportsMarketTypeSet.has(
      outcome.sportsMarketType.toLowerCase(),
    );
  });
};

export function buildOutcomeGroups(
  outcomes: PredictOutcome[],
): PredictOutcomeGroup[] {
  if (outcomes.length === 0) {
    return [];
  }

  const groupMap = new Map<string, PredictOutcome[]>();

  for (const outcome of outcomes) {
    const groupKey =
      (outcome.sportsMarketType &&
        SPORTS_MARKET_TYPE_TO_GROUP[outcome.sportsMarketType]) ||
      DEFAULT_GROUP_KEY;

    const bucket = groupMap.get(groupKey);
    if (bucket) {
      bucket.push(outcome);
    } else {
      groupMap.set(groupKey, [outcome]);
    }
  }

  for (const [, groupOutcomes] of groupMap) {
    groupOutcomes.sort((a, b) => {
      const priorityDiff =
        getSportsMarketTypePriority(
          normalizeSportsMarketType(a.sportsMarketType ?? ''),
        ) -
        getSportsMarketTypePriority(
          normalizeSportsMarketType(b.sportsMarketType ?? ''),
        );
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      if (
        a.sportsMarketType === b.sportsMarketType &&
        isLineOutcomeType(a.sportsMarketType)
      ) {
        return 0;
      }
      const volumeDiff = b.volume - a.volume;
      if (volumeDiff !== 0) return volumeDiff;
      return (b.liquidity ?? 0) - (a.liquidity ?? 0);
    });
  }

  const groupEntries = [...groupMap.entries()];
  groupEntries.sort((a, b) => {
    const aIndex = GROUP_ORDER.indexOf(a[0]);
    const bIndex = GROUP_ORDER.indexOf(b[0]);
    const aPriority = aIndex === -1 ? GROUP_ORDER.length : aIndex;
    const bPriority = bIndex === -1 ? GROUP_ORDER.length : bIndex;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a[0].localeCompare(b[0]);
  });

  return groupEntries.map(([key, groupOutcomes]) => {
    const typeMap = new Map<string, PredictOutcome[]>();
    for (const outcome of groupOutcomes) {
      const type = outcome.sportsMarketType ?? key;
      const bucket = typeMap.get(type);
      if (bucket) {
        bucket.push(outcome);
      } else {
        typeMap.set(type, [outcome]);
      }
    }

    if (typeMap.size < 2) {
      return {
        key,
        outcomes: sortLineOutcomesForDisplay(
          groupOutcomes,
          groupOutcomes[0]?.sportsMarketType ?? key,
        ),
      };
    }

    const subgroupEntries = [...typeMap.entries()];
    subgroupEntries.sort(
      (a, b) =>
        getSportsMarketTypePriority(normalizeSportsMarketType(a[0])) -
        getSportsMarketTypePriority(normalizeSportsMarketType(b[0])),
    );

    return {
      key,
      outcomes: [],
      subgroups: subgroupEntries.map(([subKey, subOutcomes]) => ({
        key: subKey,
        outcomes: sortLineOutcomesForDisplay(subOutcomes, subKey),
      })),
    };
  });
}

const sortByLiquidityAndVolume = (
  markets: PolymarketApiMarket[],
): PolymarketApiMarket[] =>
  [...markets].sort((a, b) => {
    const aScore = (a.liquidity ?? 0) + (a.volumeNum ?? 0);
    const bScore = (b.liquidity ?? 0) + (b.volumeNum ?? 0);
    return bScore - aScore;
  });

/**
 * Sort sport markets by:
 * 1. Group by sportsMarketType
 * 2. Order groups: moneyline first, spreads second, totals third, then alphabetically
 * 3. Within each group, sort by liquidity + volume (descending)
 * 4. Return flattened array of all groups in order
 */
export const sortGameMarkets = (
  markets: PolymarketApiMarket[],
): PolymarketApiMarket[] => {
  const groupedMarkets = markets.reduce<Record<string, PolymarketApiMarket[]>>(
    (acc, market) => {
      const type = market.sportsMarketType ?? 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(market);
      return acc;
    },
    {},
  );

  const sortedTypes = Object.keys(groupedMarkets).sort((a, b) => {
    const priorityA = getSportsMarketTypePriority(a);
    const priorityB = getSportsMarketTypePriority(b);

    if (priorityA === priorityB && priorityA === 3) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    }

    return priorityA - priorityB;
  });

  // Preserve API order for line markets; their display order is derived later.
  return sortedTypes.flatMap((type) =>
    isLineOutcomeType(type)
      ? groupedMarkets[type]
      : sortByLiquidityAndVolume(groupedMarkets[type]),
  );
};
