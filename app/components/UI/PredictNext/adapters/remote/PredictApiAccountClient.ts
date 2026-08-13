import type { PredictReadOptions, PredictVenueId } from '../../types';
import { PredictHttpError } from './PredictApiReadClient';

export interface PredictApiAccountTransport {
  fetchAccountReadiness(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown>;
}

export interface PredictApiAccountClientOptions {
  baseUrl: string;
  clientVersion: string;
  getBearerToken: () => Promise<string>;
  fetch?: typeof fetch;
}

/** Required-auth transport for account-scoped Predict API reads. */
export class PredictApiAccountClient implements PredictApiAccountTransport {
  readonly #baseUrl: URL;
  readonly #clientVersion: string;
  readonly #getBearerToken: () => Promise<string>;
  readonly #fetch: typeof fetch;

  constructor({
    baseUrl,
    clientVersion,
    getBearerToken,
    fetch: fetchFn = global.fetch,
  }: PredictApiAccountClientOptions) {
    this.#baseUrl = new URL(baseUrl);
    this.#clientVersion = clientVersion;
    this.#getBearerToken = getBearerToken;
    this.#fetch = fetchFn;
  }

  async fetchAccountReadiness(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<unknown> {
    const token = await this.#getBearerToken();
    if (!token) {
      throw new PredictHttpError(401);
    }

    const url = new URL(
      ['v1', 'venues', venueId, 'account', 'readiness']
        .map(encodeURIComponent)
        .join('/'),
      this.#baseUrlWithTrailingSlash(),
    );
    const response = await this.#fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
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
