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

export function getGameStatus(event: PolymarketApiEvent): PredictGameStatus {
  if (event.closed) {
    return 'ended';
  }

  if (event.score || event.elapsed || event.period) {
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
  };
}

export function buildNflGameData(
  event: PolymarketApiEvent,
  teamLookup: TeamLookup,
): PredictMarketGame | null {
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
    id: event.id,
    startTime: event.endDate ?? `${parsedSlug.dateString}T00:00:00Z`,
    status: getGameStatus(event),
    league,
    elapsed: event.elapsed ?? '',
    period: event.period ?? '',
    score: event.score ?? '',
    homeTeam,
    awayTeam,
  };
}
