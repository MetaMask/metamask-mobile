import type {
  FetchEventsParams,
  PredictEntityId,
  PredictReadOptions,
  PredictVenueId,
} from '../../types';

export interface PredictApiReadTransport {
  fetchVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchEvents(
    venueId: PredictVenueId,
    params: FetchEventsParams,
    options?: PredictReadOptions,
  ): Promise<unknown>;
  fetchEvent(
    venueId: PredictVenueId,
    eventId: PredictEntityId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
}

export interface PredictApiReadClientOptions {
  baseUrl: string;
  clientVersion: string;
  fetch?: typeof fetch;
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

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
  }: PredictApiReadClientOptions) {
    this.#baseUrl = new URL(baseUrl);
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
  }

  fetchVenueStatus(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['predict', 'v1', 'venues', venueId, 'status'],
      undefined,
      options,
    );
  }

  fetchEvents(
    venueId: PredictVenueId,
    params: FetchEventsParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    return this.#get(
      ['predict', 'v1', 'venues', venueId, 'events'],
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
      ['predict', 'v1', 'venues', venueId, 'events', eventId],
      undefined,
      options,
    );
  }

  async #get(
    segments: readonly string[],
    params?: FetchEventsParams,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const url = new URL(
      segments.map(encodeURIComponent).join('/'),
      this.#baseUrlWithTrailingSlash(),
    );

    if (params?.cursor !== undefined) {
      url.searchParams.set('cursor', params.cursor);
    }
    if (params?.limit !== undefined) {
      url.searchParams.set('limit', String(params.limit));
    }

    const response = await this.#fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
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
