import {
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

export type TeamLookup = (abbreviation: string) => PredictSportTeam | undefined;

export interface ParsedNflSlug {
  awayAbbreviation: string;
  homeAbbreviation: string;
  dateString: string;
}

export function parseNflSlugTeams(slug: string): ParsedNflSlug | null {
  const match = slug.match(NFL_SLUG_PATTERN);
  if (!match) {
    return null;
  }
  return {
    awayAbbreviation: match[1],
    homeAbbreviation: match[2],
    dateString: match[3],
  };
}

export function isNflGameEvent(event: PolymarketApiEvent): boolean {
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const hasNflTag = tags.some((tag) => tag.slug === 'nfl');
  const hasGamesTag = tags.some((tag) => tag.slug === 'games');
  const hasValidSlug = NFL_SLUG_PATTERN.test(event.slug);

  return hasNflTag && hasGamesTag && hasValidSlug;
}

const NOT_STARTED_PERIODS = ['NS', 'NOT_STARTED', 'PRE', 'PREGAME', ''];
const ENDED_PERIODS = ['FT', 'VFT'];

/**
 * Formats the period string from Polymarket API to user-friendly display text.
 *
 * Polymarket Period Values:
 * - NS → (not displayed, game is scheduled)
 * - Q1/Q2/Q3/Q4 → Show as-is
 * - End Q1/End Q3 → Show as-is
 * - HT → "Halftime"
 * - OT → "Overtime"
 * - FT/VFT → "Final"
 */
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

export function buildNflGameData(
  event: PolymarketApiEvent,
  teamLookup: TeamLookup,
): PredictMarketGame | null {
  if (!event.gameId) {
    return null;
  }

  const parsedSlug = parseNflSlugTeams(event.slug);
  if (!parsedSlug) {
    return null;
  }

  const awayTeam = teamLookup(parsedSlug.awayAbbreviation);
  const homeTeam = teamLookup(parsedSlug.homeAbbreviation);

  if (!awayTeam || !homeTeam) {
    return null;
  }

  const league: PredictSportsLeague = 'nfl';

  return {
    id: event.gameId,
    startTime:
      event.startTime ?? event.endDate ?? `${parsedSlug.dateString}T00:00:00Z`,
    status: getGameStatus(event),
    league,
    elapsed: event.elapsed ?? '',
    period: event.period ?? '',
    score: event.score ?? '',
    homeTeam,
    awayTeam,
  };
}
