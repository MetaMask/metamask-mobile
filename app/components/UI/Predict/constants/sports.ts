import type {
  PredictMarketGame,
  PredictSportTeam,
  PredictSportsLeague,
} from '../types';

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

export const WORLD_CUP_LEAGUE: PredictSportsLeague = 'fifwc';

export const DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES = [
  'soccer_team_to_advance',
  'soccer_extra_time',
  'soccer_penalty_shootout',
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

export const MONEYLINE_MARKET_TYPES: ReadonlySet<string> = new Set([
  'moneyline',
  'first_half_moneyline',
  'soccer_halftime_result',
  'soccer_first_to_score',
  'soccer_team_to_advance',
  'tennis_first_set_winner',
]);

export const isMoneylineLikeMarketType = (type?: string): boolean =>
  type !== undefined && MONEYLINE_MARKET_TYPES.has(type.toLowerCase());

interface NegRiskSportsMarket {
  negRisk?: boolean;
  sportsMarketType?: string;
  groupItemTitle?: string;
}

export const hasNegRiskMoneylineGroupItem = <T extends NegRiskSportsMarket>(
  market: T,
): market is T & { groupItemTitle: string } =>
  Boolean(
    market.negRisk &&
      isMoneylineLikeMarketType(market.sportsMarketType) &&
      market.groupItemTitle,
  );

const normalizeTeamLabel = (value?: string): string | undefined =>
  value?.trim().toLowerCase();

export const getMatchingSportTeam = (
  groupItemTitle: string,
  game: PredictMarketGame,
): PredictSportTeam | undefined => {
  const normalizedGroupItemTitle = normalizeTeamLabel(groupItemTitle);

  return [game.homeTeam, game.awayTeam].find((team) =>
    [team.name, team.alias, team.abbreviation]
      .map(normalizeTeamLabel)
      .some((teamLabel) => teamLabel === normalizedGroupItemTitle),
  );
};

export const resolveNegRiskMoneylineShortTitles = (
  market: NegRiskSportsMarket,
  game: PredictMarketGame,
): { yesShort?: string; noShort?: string } => {
  if (!hasNegRiskMoneylineGroupItem(market)) {
    return {};
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return { yesShort: 'Draw' };
  }

  const yesTeam = getMatchingSportTeam(market.groupItemTitle, game);
  if (!yesTeam) return {};

  const isHome = yesTeam.id === game.homeTeam.id;
  const noAbbr = isHome
    ? game.awayTeam.abbreviation
    : game.homeTeam.abbreviation;

  return { yesShort: yesTeam.abbreviation, noShort: noAbbr };
};

export const getNegRiskMoneylineTeamLogo = (
  market: NegRiskSportsMarket,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !hasNegRiskMoneylineGroupItem(market)) {
    return undefined;
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return undefined;
  }

  return getMatchingSportTeam(market.groupItemTitle, game)?.logo;
};

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
