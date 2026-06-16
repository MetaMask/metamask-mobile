import type { PredictSportsLeague } from '../types';

/**
 * Leagues with live game data support.
 *
 * To add a new league:
 * 1. Add the league to `PredictSportsLeague` type in `../types/index.ts`
 * 2. Add a slug config to `LEAGUE_SLUG_CONFIGS` in `../utils/gameParser.ts`
 * 3. Add the league to this array
 * 4. Add tests for the new league's slug parsing
 */
export const SUPPORTED_SPORTS_LEAGUES: PredictSportsLeague[] = [
  'nfl',
  'nba',
  'wnba',
  'mlb',
  'nhl',
  'ucl',
  'fif',
  'lal',
  'uef',
  'bra2',
  'tur',
  'col1',
  'mls',
  'mex',
  'bun',
  'chi',
  'epl',
  'cze1',
  'j1100',
  'j2100',
  'fl1',
  'nor',
  'aus',
  'den',
  'sea',
  'kor',
  'ere',
  'spl',
  'bra',
  'por',
  'chi1',
  'per1',
  'lib',
  'cdr',
  'sud',
  'egy1',
  'uel',
  'rou1',
  'col',
  'bol1',
  'itc',
  'dfb',
  'cde',
  'fifwc',
  'atp',
  'wta',
  'itf',
];

export const filterSupportedLeagues = (
  leagues: string[],
): PredictSportsLeague[] =>
  leagues.filter((league): league is PredictSportsLeague =>
    SUPPORTED_SPORTS_LEAGUES.includes(league as PredictSportsLeague),
  );

const DRAW_CAPABLE_LEAGUES: ReadonlySet<PredictSportsLeague> = new Set([
  'ucl',
  'fif',
  'lal',
  'uef',
  'bra2',
  'tur',
  'col1',
  'mls',
  'mex',
  'bun',
  'chi',
  'epl',
  'cze1',
  'j1100',
  'j2100',
  'fl1',
  'nor',
  'aus',
  'den',
  'sea',
  'kor',
  'ere',
  'spl',
  'bra',
  'por',
  'chi1',
  'per1',
  'lib',
  'cdr',
  'sud',
  'egy1',
  'uel',
  'rou1',
  'col',
  'bol1',
  'itc',
  'dfb',
  'cde',
  'fifwc',
]);

export const isDrawCapableLeague = (league: PredictSportsLeague): boolean =>
  DRAW_CAPABLE_LEAGUES.has(league);

/**
 * Whether a league is association football (soccer).
 *
 * Soccer leagues use minute-based match clocks (rendered as "75’") and play in
 * halves rather than quarters. In this codebase the soccer leagues are exactly
 * the draw-capable leagues, so we reuse that set here. If a non-soccer
 * draw-capable league is ever added, introduce a dedicated soccer set.
 */
export const isSoccerLeague = (league: PredictSportsLeague): boolean =>
  isDrawCapableLeague(league);

export const GROUP_ORDER: string[] = [
  'game_lines',
  'first_half',
  'second_half',
  'first_set',
  'team_totals',
  'touchdowns',
  'rushing',
  'receiving',
  'points',
  'rebounds',
  'exact_score',
  'halftime',
  'corners',
  'goals',
  'goalscorers',
  'goals_plus_assists',
  'assists',
  'shots',
  'shots_on_target',
  'goalkeeper_saves',
];

export const DEFAULT_GROUP_KEY = 'game_lines';

type SportsMarketCardSplit =
  | 'aggregate'
  | 'team'
  | 'player'
  | 'line'
  | 'single';

interface SportsMarketTypeDescriptor {
  type: string;
  group?: string;
  priority?: number;
  moneyline?: boolean;
  cardSplit?: SportsMarketCardSplit;
}

export const SPORTS_MARKET_TYPE_DESCRIPTORS: readonly SportsMarketTypeDescriptor[] =
  [
    { type: 'moneyline', priority: 0, moneyline: true, cardSplit: 'aggregate' },
    { type: 'spreads', priority: 1, cardSplit: 'aggregate' },
    { type: 'totals', priority: 2, cardSplit: 'line' },
    { type: 'nrfi', cardSplit: 'single' },
    {
      type: 'both_teams_to_score',
      priority: 3,
      cardSplit: 'single',
    },
    {
      type: 'first_half_moneyline',
      group: 'first_half',
      priority: 0,
      moneyline: true,
      cardSplit: 'aggregate',
    },
    { type: 'first_half_spreads', group: 'first_half', cardSplit: 'aggregate' },
    {
      type: 'first_half_totals',
      group: 'first_half',
      cardSplit: 'line',
    },
    {
      type: 'second_half_totals',
      group: 'second_half',
      priority: 2,
      cardSplit: 'line',
    },
    { type: 'points', group: 'points', cardSplit: 'player' },
    { type: 'assists', group: 'assists', cardSplit: 'player' },
    { type: 'rebounds', group: 'rebounds', cardSplit: 'player' },
    { type: 'basketball_total_points', cardSplit: 'single' },
    { type: 'basketball_odd_even', cardSplit: 'single' },
    { type: 'basketball_team_to_score_first', cardSplit: 'single' },
    { type: 'goalscorers', cardSplit: 'player' },
    { type: 'exact_score', cardSplit: 'single' },
    { type: 'halftime_result', cardSplit: 'single' },
    { type: 'corners', cardSplit: 'line' },
    {
      type: 'team_totals',
      group: 'team_totals',
      priority: 5,
      cardSplit: 'team',
    },
    {
      type: 'anytime_touchdowns',
      group: 'touchdowns',
      cardSplit: 'player',
    },
    {
      type: 'first_touchdowns',
      group: 'touchdowns',
      cardSplit: 'player',
    },
    { type: 'rushing_yards', group: 'rushing', cardSplit: 'player' },
    { type: 'receiving_yards', group: 'receiving', cardSplit: 'player' },
    {
      type: 'soccer_anytime_goalscorer',
      group: 'goalscorers',
      cardSplit: 'player',
    },
    { type: 'soccer_exact_score', group: 'exact_score', cardSplit: 'single' },
    {
      type: 'soccer_halftime_result',
      group: 'halftime',
      priority: 0,
      moneyline: true,
      cardSplit: 'aggregate',
    },
    {
      type: 'soccer_first_half_team_totals',
      group: 'first_half',
      priority: 5,
      cardSplit: 'team',
    },
    {
      type: 'both_teams_to_score_first_half',
      group: 'first_half',
      priority: 3,
      cardSplit: 'single',
    },
    {
      type: 'soccer_second_half_result',
      group: 'second_half',
      priority: 0,
      moneyline: true,
      cardSplit: 'aggregate',
    },
    {
      type: 'soccer_second_half_team_totals',
      group: 'second_half',
      priority: 5,
      cardSplit: 'team',
    },
    {
      type: 'both_teams_to_score_second_half',
      group: 'second_half',
      priority: 3,
      cardSplit: 'single',
    },
    {
      type: 'soccer_first_to_score',
      priority: 4,
      moneyline: true,
      cardSplit: 'aggregate',
    },
    {
      type: 'soccer_team_totals',
      priority: 5,
      cardSplit: 'team',
    },
    { type: 'total_corners', group: 'corners', cardSplit: 'line' },
    {
      type: 'soccer_team_total_corners',
      group: 'corners',
      cardSplit: 'team',
    },
    { type: 'soccer_first_corner', group: 'corners', cardSplit: 'single' },
    {
      type: 'soccer_first_half_total_corners',
      group: 'corners',
      cardSplit: 'line',
    },
    {
      type: 'soccer_second_half_total_corners',
      group: 'corners',
      cardSplit: 'line',
    },
    {
      type: 'soccer_game_corners_odd_even',
      group: 'corners',
      cardSplit: 'single',
    },
    { type: 'soccer_player_goals', group: 'goals', cardSplit: 'player' },
    {
      type: 'soccer_player_assists',
      group: 'assists',
      cardSplit: 'player',
    },
    { type: 'soccer_player_shots', group: 'shots', cardSplit: 'player' },
    {
      type: 'soccer_player_goals_plus_assists',
      group: 'goals_plus_assists',
      cardSplit: 'player',
    },
    {
      type: 'soccer_player_shots_on_target',
      group: 'shots_on_target',
      cardSplit: 'player',
    },
    {
      type: 'soccer_player_goalkeeper_saves',
      group: 'goalkeeper_saves',
      cardSplit: 'player',
    },
    { type: 'tennis_set_totals', priority: 2, cardSplit: 'line' },
    { type: 'tennis_set_handicap', cardSplit: 'aggregate' },
    { type: 'tennis_match_totals', priority: 3, cardSplit: 'line' },
    {
      type: 'tennis_first_set_totals',
      group: 'first_set',
      priority: 2,
      cardSplit: 'line',
    },
    {
      type: 'tennis_first_set_winner',
      group: 'first_set',
      priority: 0,
      moneyline: true,
      cardSplit: 'aggregate',
    },
    { type: 'tennis_completed_match', priority: 6, cardSplit: 'single' },
  ];

const SPORTS_MARKET_TYPE_DESCRIPTOR_BY_TYPE = new Map(
  SPORTS_MARKET_TYPE_DESCRIPTORS.map((descriptor) => [
    descriptor.type,
    descriptor,
  ]),
);

export const SPORTS_MARKET_TYPE_TO_GROUP: Record<string, string> =
  Object.fromEntries(
    SPORTS_MARKET_TYPE_DESCRIPTORS.flatMap(({ type, group }) =>
      group && group !== DEFAULT_GROUP_KEY ? [[type, group]] : [],
    ),
  );

const PLAYER_PROP_GROUP_PATTERN = /^[a-z0-9]+_player_(.+)$/;

const derivePlayerPropGroupKey = (type: string): string | null =>
  type.match(PLAYER_PROP_GROUP_PATTERN)?.[1] ?? null;

export const getSportsMarketTypeGroupKey = (type?: string): string => {
  if (!type) {
    return DEFAULT_GROUP_KEY;
  }

  const lower = type.toLowerCase();

  return (
    SPORTS_MARKET_TYPE_TO_GROUP[lower] ??
    derivePlayerPropGroupKey(lower) ??
    DEFAULT_GROUP_KEY
  );
};

export const SPORTS_MARKET_TYPE_PRIORITIES: Record<string, number> = {
  ...Object.fromEntries(
    SPORTS_MARKET_TYPE_DESCRIPTORS.flatMap(({ type, priority }) =>
      priority === undefined ? [] : [[type, priority]],
    ),
  ),
};

export const SUPPORTED_SPORTS_MARKET_TYPES: ReadonlySet<string> = new Set(
  SPORTS_MARKET_TYPE_DESCRIPTORS.map(({ type }) => type),
);

export const isSupportedSportsMarketType = (type?: string): boolean =>
  type === undefined || SUPPORTED_SPORTS_MARKET_TYPES.has(type.toLowerCase());

export const MONEYLINE_MARKET_TYPES: ReadonlySet<string> = new Set(
  SPORTS_MARKET_TYPE_DESCRIPTORS.flatMap(({ type, moneyline }) =>
    moneyline ? [type] : [],
  ),
);

export const isMoneylineLikeMarketType = (type?: string): boolean =>
  type !== undefined && MONEYLINE_MARKET_TYPES.has(type.toLowerCase());

/**
 * Per-player markets (goals, assists, shots, points, ...). These are split into
 * one card per player. Soccer types follow the `*_player_*` naming; the rest
 * are listed explicitly.
 */
export const PLAYER_PROP_MARKET_TYPES: ReadonlySet<string> = new Set(
  SPORTS_MARKET_TYPE_DESCRIPTORS.flatMap(({ type, cardSplit }) =>
    cardSplit === 'player' ? [type] : [],
  ),
);

export const isPlayerPropMarketType = (type?: string): boolean => {
  if (type === undefined) {
    return false;
  }
  const lower = type.toLowerCase();
  return PLAYER_PROP_MARKET_TYPES.has(lower) || lower.includes('player');
};

export const getSportsMarketTypeCardSplit = (
  type?: string,
): SportsMarketCardSplit | undefined =>
  type
    ? SPORTS_MARKET_TYPE_DESCRIPTOR_BY_TYPE.get(type.toLowerCase())?.cardSplit
    : undefined;

export const getPrimaryMoneylineOutcomes = <
  T extends { sportsMarketType?: string },
>(
  outcomes: T[],
): T[] => {
  const moneylineOutcomes = outcomes.filter(
    (outcome) => outcome.sportsMarketType?.toLowerCase() === 'moneyline',
  );

  return moneylineOutcomes.length > 0 ? moneylineOutcomes : outcomes;
};
