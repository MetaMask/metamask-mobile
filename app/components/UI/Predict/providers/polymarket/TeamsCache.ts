/* eslint-disable @metamask/design-tokens/color-no-hex */
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { PredictSportsLeague } from '../../types';
import { PolymarketApiTeam } from './types';
import { getPolymarketEndpoints } from './utils';

import { POLYMARKET_PROVIDER_ID } from './constants';
const TEAM_COLOR_OVERRIDES: Record<string, string> = {
  ne: '#1D4E9B',
  sea: '#5BA423',
};

export class TeamsCache {
  private static instance: TeamsCache | null = null;
  private cache: Map<PredictSportsLeague, Map<string, PolymarketApiTeam>> =
    new Map();
  private loadingPromises: Map<PredictSportsLeague, Promise<void>> = new Map();

  // eslint-disable-next-line no-empty-function
  private constructor() {}

  static getInstance(): TeamsCache {
    TeamsCache.instance ??= new TeamsCache();
    return TeamsCache.instance;
  }

  static resetInstance(): void {
    if (TeamsCache.instance) {
      TeamsCache.instance.clear();
      TeamsCache.instance = null;
    }
  }

  async ensureLeagueLoaded(league: PredictSportsLeague): Promise<void> {
    if (this.cache.has(league)) {
      return;
    }

    const existingPromise = this.loadingPromises.get(league);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = this.fetchAndCacheTeams(league);
    this.loadingPromises.set(league, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(league);
    }
  }

  async ensureLeaguesLoaded(leagues: PredictSportsLeague[]): Promise<void> {
    await Promise.all(leagues.map((league) => this.ensureLeagueLoaded(league)));
  }

  async ensureTeamsLoaded(
    requests: { league: PredictSportsLeague; abbreviation: string }[],
  ): Promise<void> {
    const missing = requests.filter(
      ({ league, abbreviation }) => !this.getTeam(league, abbreviation),
    );

    if (missing.length === 0) {
      return;
    }

    const grouped = new Map<PredictSportsLeague, Set<string>>();
    for (const { league, abbreviation } of missing) {
      let set = grouped.get(league);
      if (!set) {
        set = new Set();
        grouped.set(league, set);
      }
      set.add(abbreviation.toLowerCase());
    }

    await Promise.all(
      Array.from(grouped.entries()).map(([league, abbreviations]) =>
        this.fetchTeamsByAbbreviation(league, Array.from(abbreviations)),
      ),
    );
  }

  getTeam(
    league: PredictSportsLeague,
    abbreviation: string,
  ): PolymarketApiTeam | undefined {
    const leagueCache = this.cache.get(league);
    if (!leagueCache) {
      return undefined;
    }
    return leagueCache.get(abbreviation.toLowerCase());
  }

  isLeagueLoaded(league: PredictSportsLeague): boolean {
    return this.cache.has(league);
  }

  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  getTeamCount(league: PredictSportsLeague): number {
    return this.cache.get(league)?.size ?? 0;
  }

  private async fetchTeamsByAbbreviation(
    league: PredictSportsLeague,
    abbreviations: string[],
  ): Promise<void> {
    const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
    const abbrParams = abbreviations
      .map((a) => `abbreviation=${encodeURIComponent(a)}`)
      .join('&');
    const url = `${GAMMA_API_ENDPOINT}/teams?league=${league}&${abbrParams}`;

    DevLogger.log(
      `[TeamsCache] Fetching ${abbreviations.length} teams for league: ${league}`,
    );

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorMessage = `Failed to fetch teams for ${league}: ${response.status}`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: 'TeamsCache.fetchTeamsByAbbreviation',
          league,
          statusCode: response.status,
        });
        return;
      }

      const teams: PolymarketApiTeam[] = await response.json();

      if (!Array.isArray(teams)) {
        const errorMessage = `Invalid response format for ${league} teams`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: 'TeamsCache.fetchTeamsByAbbreviation',
          league,
        });
        return;
      }

      let leagueCache = this.cache.get(league);
      if (!leagueCache) {
        leagueCache = new Map<string, PolymarketApiTeam>();
        this.cache.set(league, leagueCache);
      }

      for (const team of teams) {
        if (team.abbreviation) {
          team.color = TEAM_COLOR_OVERRIDES[team.abbreviation] ?? team.color;
          leagueCache.set(team.abbreviation.toLowerCase(), team);
        }
      }

      DevLogger.log(
        `[TeamsCache] Cached ${teams.length} targeted teams for league: ${league}`,
      );
    } catch (error) {
      DevLogger.log(
        `[TeamsCache] Error fetching teams for ${league}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        feature: 'predict',
        provider: POLYMARKET_PROVIDER_ID,
        method: 'TeamsCache.fetchTeamsByAbbreviation',
        league,
      });
    }
  }

  private async fetchAndCacheTeams(league: PredictSportsLeague): Promise<void> {
    const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
    const url = `${GAMMA_API_ENDPOINT}/teams?league=${league}`;

    DevLogger.log(`[TeamsCache] Fetching teams for league: ${league}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorMessage = `Failed to fetch teams for ${league}: ${response.status}`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: 'TeamsCache.fetchAndCacheTeams',
          league,
          statusCode: response.status,
        });
        return;
      }

      const teams: PolymarketApiTeam[] = await response.json();

      if (!Array.isArray(teams)) {
        const errorMessage = `Invalid response format for ${league} teams`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: 'TeamsCache.fetchAndCacheTeams',
          league,
        });
        return;
      }

      const leagueCache = new Map<string, PolymarketApiTeam>();

      for (const team of teams) {
        if (team.abbreviation) {
          team.color = TEAM_COLOR_OVERRIDES[team.abbreviation] ?? team.color;
          leagueCache.set(team.abbreviation.toLowerCase(), team);
        }
      }

      this.cache.set(league, leagueCache);

      DevLogger.log(
        `[TeamsCache] Cached ${leagueCache.size} teams for league: ${league}`,
      );
    } catch (error) {
      DevLogger.log(
        `[TeamsCache] Error fetching teams for ${league}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        feature: 'predict',
        provider: POLYMARKET_PROVIDER_ID,
        method: 'TeamsCache.fetchAndCacheTeams',
        league,
      });
    }
  }
}
