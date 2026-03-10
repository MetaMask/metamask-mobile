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
  private teamBatchLoadingPromises: Map<string, Promise<void>> = new Map();

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
    league: PredictSportsLeague,
    abbreviations: string[],
  ): Promise<void> {
    const uncached = [
      ...new Set(abbreviations.map((a) => a.toLowerCase())),
    ].filter((abbr) => !this.getTeam(league, abbr));

    if (uncached.length === 0) {
      return;
    }

    const key = `${league}:${uncached.sort().join(',')}`;
    const existingPromise = this.teamBatchLoadingPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = this.fetchAndCacheSpecificTeams(league, uncached);
    this.teamBatchLoadingPromises.set(key, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.teamBatchLoadingPromises.delete(key);
    }
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
    this.teamBatchLoadingPromises.clear();
  }

  getTeamCount(league: PredictSportsLeague): number {
    return this.cache.get(league)?.size ?? 0;
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

  private async fetchAndCacheSpecificTeams(
    league: PredictSportsLeague,
    abbreviations: string[],
  ): Promise<void> {
    const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
    const params = new URLSearchParams({ league });
    abbreviations.forEach((abbr) => params.append('abbreviation', abbr));
    const url = `${GAMMA_API_ENDPOINT}/teams?${params.toString()}`;

    DevLogger.log(
      `[TeamsCache] Fetching specific teams for league: ${league}, teams: ${abbreviations.join(', ')}`,
    );

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorMessage = `Failed to fetch specific teams for ${league}: ${response.status}`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: 'TeamsCache.fetchAndCacheSpecificTeams',
          league,
          abbreviations,
          statusCode: response.status,
        });
        return;
      }

      const teams: PolymarketApiTeam[] = await response.json();

      if (!Array.isArray(teams)) {
        const errorMessage = `Invalid response format for ${league} specific teams`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: 'TeamsCache.fetchAndCacheSpecificTeams',
          league,
          abbreviations,
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
        `[TeamsCache] Cached ${teams.length} specific teams for league: ${league}`,
      );
    } catch (error) {
      DevLogger.log(
        `[TeamsCache] Error fetching specific teams for ${league}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        feature: 'predict',
        provider: POLYMARKET_PROVIDER_ID,
        method: 'TeamsCache.fetchAndCacheSpecificTeams',
        league,
        abbreviations,
      });
    }
  }
}
