import type {
  FetchFeedParams,
  FetchOrderPreviewParams,
  FetchPortfolioPageParams,
  FetchSearchParams,
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
  fetchPositions(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchActivity(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
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
  searchEvents(
    venueId: PredictVenueId,
    params: FetchSearchParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchOrderPreview(
    venueId: PredictVenueId,
    params: FetchOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
}

type PredictApiReadQueryParams = FetchFeedParams &
  Partial<FetchSearchParams> & {
    range?: PredictMarketHistoryRange;
  };

export interface PredictApiReadClientOptions {
  baseUrl?: string;
  clientVersion: string;
  fetch?: typeof fetch;
  getBearerToken: () => Promise<string | undefined>;
}

const parseBaseUrl = (baseUrl?: string): URL | undefined => {
  if (!baseUrl) {
    return undefined;
  }
  try {
    return new URL(baseUrl);
  } catch {
    return undefined;
  }
};

export class PredictHttpError extends Error {
  readonly status: number;
  /** Canonical error code from the response body, when the backend sends one. */
  readonly bodyCode?: string;

  constructor(status: number, bodyCode?: string) {
    super(`Predict API request failed with status ${status}.`);
    this.name = 'PredictHttpError';
    this.status = status;
    this.bodyCode = bodyCode;
  }
}

export class PredictApiReadClient implements PredictApiReadTransport {
  readonly #baseUrl?: URL;
  readonly #clientVersion: string;
  readonly #fetch: typeof fetch;
  readonly #getBearerToken: () => Promise<string | undefined>;

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
    getBearerToken,
  }: PredictApiReadClientOptions) {
    this.#baseUrl = parseBaseUrl(baseUrl);
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
    return this.#get(['v1', 'venues', venueId, 'balance'], undefined, options);
  }

  fetchPositions(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'positions'], params, options);
  }

  fetchActivity(
    venueId: PredictVenueId,
    params: FetchPortfolioPageParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'activity'], params, options);
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

  searchEvents(
    venueId: PredictVenueId,
    params: FetchSearchParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(['v1', 'venues', venueId, 'search'], params, options);
  }

  fetchOrderPreview(
    venueId: PredictVenueId,
    params: FetchOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#postAuthenticated(
      ['v1', 'venues', venueId, 'orders', 'preview'],
      params,
      options,
    );
  }

  /**
   * Every predict-api route requires a bearer token, so one is resolved for
   * each request rather than per endpoint.
   */
  async #resolveBearerToken(): Promise<string> {
    // A missing or failing token provider is an authentication failure, not a
    // malformed response. Never let the provider's error text escape.
    const token = await this.#getBearerToken().catch(() => undefined);
    if (!token?.trim()) {
      throw new PredictHttpError(401);
    }
    return token;
  }

  async #get(
    segments: readonly string[],
    params?: PredictApiReadQueryParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();

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
        Authorization: `Bearer ${bearerToken}`,
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

  async #postAuthenticated(
    segments: readonly string[],
    body: FetchOrderPreviewParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const bearerToken = await this.#resolveBearerToken();
    return this.#post(segments, body, bearerToken, options);
  }

  async #post(
    segments: readonly string[],
    body: FetchOrderPreviewParams,
    bearerToken: string,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );

    const response = await this.#fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const bodyCode = await this.#extractErrorCode(response);
      throw new PredictHttpError(response.status, bodyCode);
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

  /** Reads the canonical error code from an error response body, if any. */
  async #extractErrorCode(response: Response): Promise<string | undefined> {
    try {
      const body = (await response.json()) as { code?: unknown };
      return typeof body.code === 'string' ? body.code : undefined;
    } catch {
      return undefined;
    }
  }

  #baseUrlWithTrailingSlash(): URL {
    if (!this.#baseUrl) {
      throw new PredictHttpError(503);
    }
    const url = new URL(this.#baseUrl.toString());
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/`;
    return url;
  }
}
