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
const SOCCER_TEAM_TOTALS_MARKET_TYPE = 'soccer_team_totals';
const SOCCER_PLAYER_GOALS_MARKET_TYPE = 'soccer_player_goals';
const OVER_UNDER_SUBJECT_PATTERN = /^(.*?)[:]?\s*O\/U\s*[\d.]+\s*$/;
const PLAYER_GOALS_SUBJECT_PATTERN = /^(.+?):\s*\d+\+\s+goals?\s*$/iu;
const MAX_PLAYER_GOAL_SUBGROUPS = 16;

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

const isSoccerTeamTotalsMarketType = (type?: string): boolean =>
  type?.toLowerCase() === SOCCER_TEAM_TOTALS_MARKET_TYPE;

const getOutcomeSubject = (outcome: PredictOutcome): string => {
  const raw = outcome.groupItemTitle || outcome.title || outcome.id;
  const overUnder = raw.match(OVER_UNDER_SUBJECT_PATTERN);
  const subject = overUnder?.[1]?.trim();

  return subject || raw.trim() || outcome.id;
};

const buildSoccerTeamTotalsSubgroups = (
  outcomes: PredictOutcome[],
): PredictOutcomeGroup[] => {
  const outcomesBySubject = new Map<string, PredictOutcome[]>();

  for (const outcome of outcomes) {
    const subject = getOutcomeSubject(outcome);
    const bucket = outcomesBySubject.get(subject);
    if (bucket) {
      bucket.push(outcome);
    } else {
      outcomesBySubject.set(subject, [outcome]);
    }
  }

  return [...outcomesBySubject.entries()].map(
    ([subject, subjectOutcomes], index) => ({
      key: `${SOCCER_TEAM_TOTALS_MARKET_TYPE}-${index}`,
      title: `${subject} Totals`,
      outcomes: sortLineOutcomesForDisplay(
        subjectOutcomes,
        SOCCER_TEAM_TOTALS_MARKET_TYPE,
      ),
    }),
  );
};

const isSoccerPlayerGoalsMarketType = (type?: string): boolean =>
  type?.toLowerCase() === SOCCER_PLAYER_GOALS_MARKET_TYPE;

const getPlayerGoalSubject = (outcome: PredictOutcome): string => {
  const raw = outcome.groupItemTitle || outcome.title || outcome.id;
  const player = raw.match(PLAYER_GOALS_SUBJECT_PATTERN)?.[1]?.trim();

  return player || raw.split(':')[0].trim() || outcome.id;
};

const getPlayerGoalSubgroupKey = (player: string): string => {
  const normalizedPlayer = player
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const slug =
    normalizedPlayer.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
    'unknown-player';

  return `${SOCCER_PLAYER_GOALS_MARKET_TYPE}-${slug}`;
};

const buildSoccerPlayerGoalsSubgroups = (
  outcomes: PredictOutcome[],
): PredictOutcomeGroup[] => {
  const outcomesByPlayerKey = new Map<
    string,
    { title: string; outcomes: PredictOutcome[] }
  >();

  for (const outcome of outcomes) {
    const player = getPlayerGoalSubject(outcome);
    const key = getPlayerGoalSubgroupKey(player);
    const bucket = outcomesByPlayerKey.get(key);
    if (bucket) {
      bucket.outcomes.push(outcome);
    } else {
      outcomesByPlayerKey.set(key, { title: player, outcomes: [outcome] });
    }
  }

  return [...outcomesByPlayerKey.entries()]
    .sort((a, b) => {
      const aScore = a[1].outcomes.reduce(
        (sum, outcome) => sum + outcome.volume + (outcome.liquidity ?? 0),
        0,
      );
      const bScore = b[1].outcomes.reduce(
        (sum, outcome) => sum + outcome.volume + (outcome.liquidity ?? 0),
        0,
      );

      if (aScore !== bScore) {
        return bScore - aScore;
      }

      return a[1].title.localeCompare(b[1].title);
    })
    .slice(0, MAX_PLAYER_GOAL_SUBGROUPS)
    .map(([key, playerGroup]) => ({
      key,
      title: playerGroup.title,
      outcomes: sortLineOutcomesForDisplay(
        playerGroup.outcomes,
        SOCCER_PLAYER_GOALS_MARKET_TYPE,
      ),
    }));
};

const buildSubgroupsForType = (
  type: string,
  outcomes: PredictOutcome[],
): PredictOutcomeGroup[] => {
  if (isSoccerTeamTotalsMarketType(type)) {
    return buildSoccerTeamTotalsSubgroups(outcomes);
  }

  if (isSoccerPlayerGoalsMarketType(type)) {
    return buildSoccerPlayerGoalsSubgroups(outcomes);
  }

  return [
    {
      key: type,
      outcomes: sortLineOutcomesForDisplay(outcomes, type),
    },
  ];
};

export const normalizeSportsMarketTypes = (value: unknown): string[] => {
  const rawTypes = Array.isArray(value) ? value : [];
  return [
    ...new Set(rawTypes.map((type) => String(type).toLowerCase())),
  ].filter((type) => SUPPORTED_SPORTS_MARKET_TYPES.has(type));
};

export const normalizeEnabledSportsMarketTypes = (value: unknown): string[] =>
  normalizeSportsMarketTypes(
    Array.isArray(value) ? value : [...SUPPORTED_SPORTS_MARKET_TYPES],
  );

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
      const [[type, typeOutcomes]] = typeMap.entries();
      if (
        isSoccerTeamTotalsMarketType(type) ||
        isSoccerPlayerGoalsMarketType(type)
      ) {
        return {
          key,
          outcomes: [],
          subgroups: buildSubgroupsForType(type, typeOutcomes),
        };
      }

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
      subgroups: subgroupEntries.flatMap(([subKey, subOutcomes]) =>
        buildSubgroupsForType(subKey, subOutcomes),
      ),
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
