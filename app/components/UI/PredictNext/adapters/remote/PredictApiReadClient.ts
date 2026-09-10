import type {
  FetchFeedParams,
  PredictEntityId,
  PredictFeedId,
  PredictMarketHistoryRange,
  PredictReadOptions,
  PredictVenueId,
} from '../../types';

export interface PredictApiReadTransport {
  fetchVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchBalance(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchFeed(
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FetchFeedParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchMarketHistory(
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ): Promise<unknown>;
}

type PredictApiReadQueryParams = FetchFeedParams & {
  range?: PredictMarketHistoryRange;
};

export interface PredictApiReadClientOptions {
  baseUrl: string;
  clientVersion: string;
  fetch?: typeof fetch;
  getBearerToken?: () => Promise<string | undefined>;
}

export class PredictHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Predict API request failed with status ${status}.`);
    this.name = 'PredictHttpError';
    this.status = status;
  }
}

export class PredictApiReadClient implements PredictApiReadTransport {
  readonly #baseUrl: URL;
  readonly #clientVersion: string;
  readonly #fetch: typeof fetch;
  readonly #getBearerToken?: () => Promise<string | undefined>;

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
    getBearerToken,
  }: PredictApiReadClientOptions) {
    this.#baseUrl = new URL(baseUrl);
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
    this.#getBearerToken = getBearerToken;
  }

  fetchVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'status'], undefined, options);
  }

  fetchBalance(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#getAuthenticated(
      ['v1', 'venues', venueId, 'balance'],
      options,
    );
  }

  fetchFeed(
    venueId: PredictVenueId,
    feedId: PredictFeedId,
    params: FetchFeedParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'feeds', feedId],
      params,
      options,
    );
  }

  fetchEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'events', eventId],
      undefined,
      options,
    );
  }

  fetchMarketHistory(
    venueId: PredictVenueId,
    marketId: PredictEntityId,
    range: PredictMarketHistoryRange,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['v1', 'venues', venueId, 'markets', marketId, 'history'],
      { range },
      options,
    );
  }

  async #getAuthenticated(
    segments: readonly string[],
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const token = await this.#getBearerToken?.();
    if (!token?.trim()) {
      throw new PredictHttpError(401);
    }
    return this.#get(segments, undefined, options, token);
  }

  async #get(
    segments: readonly string[],
    params?: PredictApiReadQueryParams,
    options?: PredictReadOptions,
    bearerToken?: string,
  ): Promise<unknown> {
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await this.#fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new PredictHttpError(response.status);
    }

    try {
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new PredictHttpError(response.status);
    }
  }

  #baseUrlWithTrailingSlash(): URL {
    const url = new URL(this.#baseUrl.toString());
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/`;
    return url;
  }
}
