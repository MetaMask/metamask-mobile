/* eslint-disable @metamask/design-tokens/color-no-hex */
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import type { PredictSportsLeague } from '../../types';
import { getPolymarketTeamLeague } from '../../utils/gameParser';
import type { PolymarketApiTeam } from './types';
import { fetchWithTimeout } from './fetchWithTimeout';
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
  private fullyLoadedLeagues: Set<PredictSportsLeague> = new Set();
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
    if (this.fullyLoadedLeagues.has(league)) {
      return;
    }

    const existingPromise = this.loadingPromises.get(league);
    if (existingPromise) {
      return existingPromise;
    }

    const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
    const teamLeague = getPolymarketTeamLeague(league);
    const url = `${GAMMA_API_ENDPOINT}/teams?league=${teamLeague}`;

    const loadPromise = this.fetchAndCacheFromUrl(
      league,
      url,
      'replace',
      'TeamsCache.ensureLeagueLoaded',
    ).then((success) => {
      if (success) {
        this.fullyLoadedLeagues.add(league);
      }
    });
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
    await this.ensureTeamsLoadedForLeagues(new Map([[league, abbreviations]]));
  }

  /**
   * Load the given team abbreviations across one or more leagues in a single
   * Gamma `/teams` request. Repeated `league=` and `abbreviation=` params are
   * valid; the response is partitioned back into per-league cache maps.
   */
  async ensureTeamsLoadedForLeagues(
    neededTeams: Map<PredictSportsLeague, string[]>,
  ): Promise<void> {
    const uncached = this.collectUncachedTeams(neededTeams);
    if (uncached.size === 0) {
      return;
    }

    const key = this.buildBatchKey(uncached);
    const existingPromise = this.teamBatchLoadingPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const url = this.buildTeamsUrl(uncached);
    const loadPromise = this.fetchAndCacheBatchedTeams(uncached, url).then(
      () => undefined as void,
    );
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
    return this.fullyLoadedLeagues.has(league);
  }

  clear(): void {
    this.cache.clear();
    this.fullyLoadedLeagues.clear();
    this.loadingPromises.clear();
    this.teamBatchLoadingPromises.clear();
  }

  getTeamCount(league: PredictSportsLeague): number {
    return this.cache.get(league)?.size ?? 0;
  }

  private collectUncachedTeams(
    neededTeams: Map<PredictSportsLeague, string[]>,
  ): Map<PredictSportsLeague, string[]> {
    const uncached = new Map<PredictSportsLeague, string[]>();

    for (const [league, abbreviations] of neededTeams) {
      const missing = [
        ...new Set(
          abbreviations.map((abbreviation) => abbreviation.toLowerCase()),
        ),
      ]
        .filter((abbreviation) => !this.getTeam(league, abbreviation))
        .sort((left, right) => left.localeCompare(right));

      if (missing.length > 0) {
        uncached.set(league, missing);
      }
    }

    return uncached;
  }

  private buildBatchKey(uncached: Map<PredictSportsLeague, string[]>): string {
    return [...uncached.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([league, abbreviations]) => `${league}:${abbreviations.join(',')}`)
      .join('|');
  }

  private buildTeamsUrl(uncached: Map<PredictSportsLeague, string[]>): string {
    const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
    const params = new URLSearchParams();

    for (const [league, abbreviations] of [...uncached.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      params.append('league', getPolymarketTeamLeague(league));
      abbreviations.forEach((abbreviation) => {
        params.append('abbreviation', abbreviation);
      });
    }

    return `${GAMMA_API_ENDPOINT}/teams?${params.toString()}`;
  }

  private async fetchAndCacheBatchedTeams(
    uncached: Map<PredictSportsLeague, string[]>,
    url: string,
  ): Promise<boolean> {
    const leagues = [...uncached.keys()];
    const abbreviations = [...uncached.values()].flat();

    DevLogger.log(
      `[TeamsCache] Fetching teams for leagues: ${leagues.join(', ')}, teams: ${abbreviations.join(', ')}`,
    );

    const teams = await this.fetchTeamsFromUrl(
      url,
      'TeamsCache.ensureTeamsLoadedForLeagues',
      { leagues, abbreviations },
    );
    if (!teams) {
      return false;
    }

    this.cacheBatchedTeams(teams, uncached);

    DevLogger.log(
      `[TeamsCache] Cached ${teams.length} teams for leagues: ${leagues.join(', ')}`,
    );

    return true;
  }

  private cacheBatchedTeams(
    teams: PolymarketApiTeam[],
    uncached: Map<PredictSportsLeague, string[]>,
  ): void {
    const requestedLeagues = [...uncached.keys()];

    for (const team of teams) {
      if (!team.abbreviation) {
        continue;
      }

      const abbreviation = team.abbreviation.toLowerCase();
      team.color = TEAM_COLOR_OVERRIDES[abbreviation] ?? team.color;

      const targetLeagues = this.resolveLeaguesForTeam(
        team,
        requestedLeagues,
        uncached,
      );

      for (const league of targetLeagues) {
        const leagueCache =
          this.cache.get(league) ?? new Map<string, PolymarketApiTeam>();
        leagueCache.set(abbreviation, team);
        this.cache.set(league, leagueCache);
      }
    }
  }

  /**
   * Map a Gamma team onto the Predict league caches that requested it.
   * Prefer `team.league` (including API aliases like csgo → cs2). If Gamma
   * omits league, fall back to the league that asked for this abbreviation.
   */
  private resolveLeaguesForTeam(
    team: PolymarketApiTeam,
    requestedLeagues: PredictSportsLeague[],
    uncached: Map<PredictSportsLeague, string[]>,
  ): PredictSportsLeague[] {
    if (team.league) {
      const apiLeague = team.league.toLowerCase();
      return requestedLeagues.filter(
        (league) => getPolymarketTeamLeague(league).toLowerCase() === apiLeague,
      );
    }

    const abbreviation = team.abbreviation.toLowerCase();
    return requestedLeagues.filter((league) =>
      uncached.get(league)?.includes(abbreviation),
    );
  }

  /**
   * Shared fetch+cache logic for both full-league and specific-team loading.
   *
   * @param league - The league to cache teams under
   * @param url - The fully-constructed API URL
   * @param mode - 'replace' creates a fresh league cache; 'merge' adds to existing
   * @param callerMethod - For error logging context
   * @param abbreviations - Optional, for error logging on specific-team fetches
   */
  private async fetchAndCacheFromUrl(
    league: PredictSportsLeague,
    url: string,
    mode: 'replace' | 'merge',
    callerMethod: string,
    abbreviations?: string[],
  ): Promise<boolean> {
    DevLogger.log(
      `[TeamsCache] Fetching teams for league: ${league}${abbreviations ? `, teams: ${abbreviations.join(', ')}` : ''}`,
    );

    const teams = await this.fetchTeamsFromUrl(url, callerMethod, {
      league,
      ...(abbreviations && { abbreviations }),
    });
    if (!teams) {
      return false;
    }

    const leagueCache =
      mode === 'merge'
        ? (this.cache.get(league) ?? new Map<string, PolymarketApiTeam>())
        : new Map<string, PolymarketApiTeam>();

    for (const team of teams) {
      if (team.abbreviation) {
        team.color =
          TEAM_COLOR_OVERRIDES[team.abbreviation.toLowerCase()] ?? team.color;
        leagueCache.set(team.abbreviation.toLowerCase(), team);
      }
    }

    this.cache.set(league, leagueCache);

    DevLogger.log(
      `[TeamsCache] Cached ${teams.length} teams for league: ${league}`,
    );

    return true;
  }

  private async fetchTeamsFromUrl(
    url: string,
    callerMethod: string,
    extra: Record<string, unknown>,
  ): Promise<PolymarketApiTeam[] | null> {
    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        const errorMessage = `Failed to fetch teams: ${response.status}`;
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: callerMethod,
          ...extra,
          statusCode: response.status,
        });
        return null;
      }

      const teams: PolymarketApiTeam[] = await response.json();

      if (!Array.isArray(teams)) {
        const errorMessage = 'Invalid response format for teams';
        DevLogger.log(`[TeamsCache] ${errorMessage}`);
        Logger.error(new Error(errorMessage), {
          feature: 'predict',
          provider: POLYMARKET_PROVIDER_ID,
          method: callerMethod,
          ...extra,
        });
        return null;
      }

      return teams;
    } catch (error) {
      DevLogger.log(
        '[TeamsCache] Error fetching teams:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        feature: 'predict',
        provider: POLYMARKET_PROVIDER_ID,
        method: callerMethod,
        ...extra,
      });
      return null;
    }
  }
}
