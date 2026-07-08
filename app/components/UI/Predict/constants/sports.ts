import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
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
export const SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE = 'soccer_team_to_advance';

export const DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES = [
  SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE,
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
  SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE,
  'tennis_first_set_winner',
]);

export const isMoneylineLikeMarketType = (type?: string): boolean =>
  type !== undefined && MONEYLINE_MARKET_TYPES.has(type.toLowerCase());

export const isTeamToAdvanceMarketType = (type?: string): boolean =>
  type?.toLowerCase() === SOCCER_TEAM_TO_ADVANCE_MARKET_TYPE;

export const shouldShowRegTimeTag = ({
  game,
  sportsMarketType,
  nonRegTimeSportsMarketTypes = [],
}: {
  game?: PredictMarketGame;
  sportsMarketType?: string;
  nonRegTimeSportsMarketTypes?: string[];
}): boolean => {
  if (game?.league !== WORLD_CUP_LEAGUE) {
    return false;
  }

  if (!sportsMarketType) {
    return true;
  }

  return !nonRegTimeSportsMarketTypes.includes(sportsMarketType.toLowerCase());
};

interface NegRiskSportsMarket {
  negRisk?: boolean;
  sportsMarketType?: string;
  groupItemTitle?: string;
}

interface TeamMatchedOutcome {
  groupItemTitle?: string;
  tokens: { title?: string }[];
}

interface SportsTeamLogoMarket extends NegRiskSportsMarket {
  sportsMarketType?: string;
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

export const sportTeamMatchesLabel = (
  label: string | undefined,
  team: PredictSportTeam,
): boolean => {
  const normalizedLabel = normalizeTeamLabel(label);
  if (!normalizedLabel) {
    return false;
  }

  return [team.name, team.alias, team.abbreviation]
    .map(normalizeTeamLabel)
    .some((teamLabel) => teamLabel === normalizedLabel);
};

export const outcomeMatchesTeam = <T extends TeamMatchedOutcome>(
  outcome: T,
  team: PredictSportTeam,
): boolean =>
  sportTeamMatchesLabel(outcome.groupItemTitle, team) ||
  sportTeamMatchesLabel(outcome.tokens[0]?.title, team);

export const getTeamOutcome = <T extends TeamMatchedOutcome & { id: string }>(
  outcomes: T[],
  team: PredictSportTeam,
  fallbackIndex: number,
  excludedOutcome?: T,
): T | undefined =>
  outcomes.find(
    (outcome) =>
      outcome.id !== excludedOutcome?.id && outcomeMatchesTeam(outcome, team),
  ) ??
  outcomes.find((outcome) => outcome.id !== excludedOutcome?.id) ??
  outcomes[fallbackIndex];

export const getMatchingSportTeam = (
  groupItemTitle: string,
  game: PredictMarketGame,
): PredictSportTeam | undefined =>
  [game.homeTeam, game.awayTeam].find((team) =>
    sportTeamMatchesLabel(groupItemTitle, team),
  );

const isGenericTeamLabel = (label: string): boolean => {
  const normalizedLabel = normalizeTeamLabel(label);
  return (
    normalizedLabel === 'team to advance' ||
    normalizedLabel?.startsWith('draw') === true
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

const hasSportsMarketTeamGroupItem = <T extends SportsTeamLogoMarket>(
  market: T,
): market is T & { groupItemTitle: string } =>
  Boolean(
    market.groupItemTitle &&
      (hasNegRiskMoneylineGroupItem(market) ||
        isTeamToAdvanceMarketType(market.sportsMarketType)),
  );

export const getSportsMarketTeamLogo = (
  market: SportsTeamLogoMarket,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !hasSportsMarketTeamGroupItem(market)) {
    return undefined;
  }

  if (isGenericTeamLabel(market.groupItemTitle)) {
    return undefined;
  }

  return getMatchingSportTeam(market.groupItemTitle, game)?.logo;
};

export const getTeamToAdvanceTokenLogo = (
  tokenTitle: string | undefined,
  game?: PredictMarketGame,
): string | undefined => {
  if (!game || !tokenTitle || isGenericTeamLabel(tokenTitle)) {
    return undefined;
  }

  return getMatchingSportTeam(tokenTitle, game)?.logo;
};

export const getTokenImage = ({
  sportsMarketType,
  tokenTitle,
  game,
}: {
  sportsMarketType?: string;
  tokenTitle?: string;
  game?: PredictMarketGame;
}): string | undefined => {
  if (isTeamToAdvanceMarketType(sportsMarketType)) {
    return getTeamToAdvanceTokenLogo(tokenTitle, game);
  }

  return undefined;
};

export const getBuyOutcomeImage = ({
  outcome,
  outcomeToken,
  game,
}: {
  outcome: PredictOutcome;
  outcomeToken?: PredictOutcomeToken;
  game?: PredictMarketGame;
}): string | undefined => {
  if (
    game?.league === WORLD_CUP_LEAGUE &&
    isTeamToAdvanceMarketType(outcome.sportsMarketType)
  ) {
    return outcomeToken?.image ?? outcome.image;
  }

  return outcome.image;
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

export const getPrimarySportsCardOutcomes = <
  T extends { sportsMarketType?: string },
>(
  outcomes: T[],
  league?: PredictSportsLeague,
): T[] => {
  if (league === WORLD_CUP_LEAGUE) {
    const advanceOutcomes = outcomes.filter((outcome) =>
      isTeamToAdvanceMarketType(outcome.sportsMarketType),
    );

    if (advanceOutcomes.length > 0) {
      return advanceOutcomes;
    }
  }

  return getPrimaryMoneylineOutcomes(outcomes);
};
