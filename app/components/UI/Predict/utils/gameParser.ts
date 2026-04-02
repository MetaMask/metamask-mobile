import {
  PredictGameScore,
  PredictGameStatus,
  PredictMarketGame,
  PredictSportTeam,
  PredictSportsLeague,
} from '../types';
import {
  PolymarketApiEvent,
  PolymarketApiTeam,
} from '../providers/polymarket/types';

type SlugTeamOrder = 'away-home' | 'home-away';

interface LeagueSlugConfig {
  pattern: RegExp;
  teamOrder: SlugTeamOrder;
  tagSlug?: string; // if different than league slug
}

const LEAGUE_SLUG_CONFIGS: Record<PredictSportsLeague, LeagueSlugConfig> = {
  nfl: {
    pattern: /^nfl-([a-z]+)-([a-z]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'away-home',
  },
  nba: {
    pattern: /^nba-([a-z]+)-([a-z]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'away-home',
  },
  ucl: {
    pattern: /^ucl-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  fif: {
    pattern: /^fif-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'fifa-friendly',
  },
  lal: {
    pattern: /^lal-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'la-liga',
  },
  uef: {
    pattern: /^uef-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'uef-qualifiers',
  },
  bra2: {
    pattern: /^bra2-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  tur: {
    pattern: /^tur-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  col1: {
    pattern: /^col1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  mls: {
    pattern: /^mls-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  mex: {
    pattern: /^mex-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  bun: {
    pattern: /^bun-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'bundesliga',
  },
  chi: {
    pattern: /^chi-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'chinese-super-league',
  },
  epl: {
    pattern: /^epl-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'premier-league',
  },
  cze1: {
    pattern: /^cze1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  j1100: {
    pattern: /^j1100-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'japan-j-league',
  },
  j2100: {
    pattern: /^j2100-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'japan-j2-league',
  },
  fl1: {
    pattern: /^fl1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'ligue-1',
  },
  nor: {
    pattern: /^nor-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'norway-eliteserien',
  },
  aus: {
    pattern: /^aus-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'australian-a-league',
  },
  den: {
    pattern: /^den-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'denmark-superliga',
  },
  sea: {
    pattern: /^sea-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  kor: {
    pattern: /^kor-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'k-league',
  },
  ere: {
    pattern: /^ere-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  spl: {
    pattern: /^spl-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'saudi-professional-league',
  },
  bra: {
    pattern: /^bra-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'brazil-serie-a',
  },
  por: {
    pattern: /^por-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'primeira-liga',
  },
  chi1: {
    pattern: /^chi1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  per1: {
    pattern: /^per1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  lib: {
    pattern: /^lib-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  cdr: {
    pattern: /^cdr-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'copa-del-rey',
  },
  sud: {
    pattern: /^sud-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  egy1: {
    pattern: /^egy1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  uel: {
    pattern: /^uel-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  rou1: {
    pattern: /^rou1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  col: {
    pattern: /^col-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'europa-conference-league',
  },
  bol1: {
    pattern: /^bol1-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'soccer',
  },
  itc: {
    pattern: /^itc-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
  },
  dfb: {
    pattern: /^dfb-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'dfb-pokal',
  },
  cde: {
    pattern: /^cde-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/,
    teamOrder: 'home-away',
    tagSlug: 'coupe-de-france',
  },
};

export type TeamLookup = (
  league: PredictSportsLeague,
  abbreviation: string,
) => PredictSportTeam | undefined;

export interface ParsedGameSlug {
  awayAbbreviation: string;
  homeAbbreviation: string;
  dateString: string;
}

export function getEventLeague(
  event: PolymarketApiEvent,
): PredictSportsLeague | null {
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const hasGamesTag = tags.some((tag) => tag.slug === 'games');
  if (!hasGamesTag) {
    return null;
  }

  const leagues = Object.keys(LEAGUE_SLUG_CONFIGS) as PredictSportsLeague[];
  for (const league of leagues) {
    const { pattern, tagSlug } = LEAGUE_SLUG_CONFIGS[league];
    const leagueTagSlug = tagSlug ?? league;
    const hasLeagueTag = tags.some((tag) => tag.slug === leagueTagSlug);
    const hasValidSlug = pattern.test(event.slug);
    if (hasLeagueTag && hasValidSlug) {
      return league;
    }
  }

  return null;
}

export function isLiveSportsEvent(
  event: PolymarketApiEvent,
  enabledLeagues: PredictSportsLeague[],
): boolean {
  const league = getEventLeague(event);
  return league !== null && enabledLeagues.includes(league);
}

export function parseGameSlugTeams(
  slug: string,
  league: PredictSportsLeague,
): ParsedGameSlug | null {
  const config = LEAGUE_SLUG_CONFIGS[league];
  if (!config) {
    return null;
  }
  const match = slug.match(config.pattern);
  if (!match) {
    return null;
  }
  const isHomeFirst = config.teamOrder === 'home-away';
  return {
    awayAbbreviation: isHomeFirst ? match[2] : match[1],
    homeAbbreviation: isHomeFirst ? match[1] : match[2],
    dateString: match[3],
  };
}

const NOT_STARTED_PERIODS = ['NS', 'NOT_STARTED', 'PRE', 'PREGAME', ''];
const ENDED_PERIODS = ['FT', 'VFT'];

export function formatPeriodDisplay(period: string): string {
  const normalized = period.toUpperCase().trim();

  switch (normalized) {
    case 'HT':
      return 'Halftime';
    case 'OT':
      return 'Overtime';
    case 'FT':
    case 'VFT':
      return 'Final';
    case '1H':
      return '1st Half';
    case '2H':
      return '2nd Half';
    case 'ET':
      return 'Extra Time';
    case 'PK':
      return 'Penalties';
    default:
      return period;
  }
}

export function getGameStatus(event: PolymarketApiEvent): PredictGameStatus {
  const period = (event.period ?? '').toUpperCase();

  if (event.ended || event.closed || ENDED_PERIODS.includes(period)) {
    return 'ended';
  }

  if (event.live) {
    return 'ongoing';
  }

  const isNotStartedPeriod = NOT_STARTED_PERIODS.includes(period);
  const hasScore = event.score && event.score !== '0-0' && event.score !== '';
  const hasElapsed = event.elapsed && event.elapsed !== '';
  const hasActivePeriod = event.period && !isNotStartedPeriod;

  if (hasScore || hasElapsed || hasActivePeriod) {
    return 'ongoing';
  }

  return 'scheduled';
}

export function mapApiTeamToPredictTeam(
  apiTeam: PolymarketApiTeam,
): PredictSportTeam {
  return {
    id: apiTeam.id,
    name: apiTeam.name,
    logo: apiTeam.logo,
    abbreviation: apiTeam.abbreviation,
    color: apiTeam.color,
    alias: apiTeam.alias,
  };
}

export function parseScore(scoreString?: string): PredictGameScore | null {
  if (!scoreString || scoreString === '0-0') {
    return null;
  }

  const parts = scoreString.split('-');
  if (parts.length !== 2) {
    return null;
  }

  const away = parseInt(parts[0], 10);
  const home = parseInt(parts[1], 10);

  if (isNaN(away) || isNaN(home)) {
    return null;
  }

  return { away, home, raw: scoreString };
}

export function buildGameData(
  event: PolymarketApiEvent,
  league: PredictSportsLeague,
  teamLookup: TeamLookup,
): PredictMarketGame | null {
  if (!event.gameId) {
    return null;
  }

  const parsedSlug = parseGameSlugTeams(event.slug, league);
  if (!parsedSlug) {
    return null;
  }

  const awayTeam = teamLookup(league, parsedSlug.awayAbbreviation);
  const homeTeam = teamLookup(league, parsedSlug.homeAbbreviation);

  if (!awayTeam || !homeTeam) {
    return null;
  }

  return {
    id: String(event.gameId),
    startTime:
      event.startTime ?? event.endDate ?? `${parsedSlug.dateString}T00:00:00Z`,
    endTime: event.finishedTimestamp,
    status: getGameStatus(event),
    league,
    elapsed: event.elapsed || null,
    period: event.period || null,
    score: parseScore(event.score),
    homeTeam,
    awayTeam,
  };
}

/**
 * Scans a list of Polymarket events and extracts the team abbreviations
 * needed for each supported league. Used to lazily load only the teams
 * referenced by the current page of markets.
 *
 * @param events - Raw events from the Polymarket API
 * @param enabledLeagues - Leagues currently enabled via feature flags
 * @returns Map from league to list of unique team abbreviations needed
 */
export function extractNeededTeamsFromEvents(
  events: PolymarketApiEvent[],
  enabledLeagues: PredictSportsLeague[],
): Map<PredictSportsLeague, string[]> {
  const neededTeams = new Map<PredictSportsLeague, Set<string>>();

  for (const event of events) {
    const league = getEventLeague(event);
    if (!league || !enabledLeagues.includes(league)) {
      continue;
    }

    const parsedSlug = parseGameSlugTeams(event.slug, league);
    if (!parsedSlug) {
      continue;
    }

    let leagueTeams = neededTeams.get(league);
    if (!leagueTeams) {
      leagueTeams = new Set<string>();
      neededTeams.set(league, leagueTeams);
    }
    leagueTeams.add(parsedSlug.awayAbbreviation);
    leagueTeams.add(parsedSlug.homeAbbreviation);
  }

  const result = new Map<PredictSportsLeague, string[]>();
  for (const [league, teams] of neededTeams) {
    result.set(league, [...teams]);
  }
  return result;
}
