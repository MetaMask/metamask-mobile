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

const NFL_SLUG_PATTERN = /^nfl-([a-z]+)-([a-z]+)-(\d{4}-\d{2}-\d{2})$/;

const LEAGUE_SLUG_PATTERNS: Record<PredictSportsLeague, RegExp> = {
  nfl: NFL_SLUG_PATTERN,
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

  const leagues = Object.keys(LEAGUE_SLUG_PATTERNS) as PredictSportsLeague[];
  for (const league of leagues) {
    const hasLeagueTag = tags.some((tag) => tag.slug === league);
    const pattern = LEAGUE_SLUG_PATTERNS[league];
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
  const pattern = LEAGUE_SLUG_PATTERNS[league];
  if (!pattern) {
    return null;
  }
  const match = slug.match(pattern);
  if (!match) {
    return null;
  }
  return {
    awayAbbreviation: match[1],
    homeAbbreviation: match[2],
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
