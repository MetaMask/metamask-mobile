import type { UiSlotsScreenId } from './types';

export type FetchUiSlotsScreenResult =
  | {
      status: 'modified';
      etag?: string;
      value: unknown;
    }
  | {
      status: 'not-modified';
      etag?: string;
    };

export interface FetchUiSlotsScreenRequest {
  screenId: UiSlotsScreenId;
  locale: string;
  etag?: string;
  signal?: AbortSignal;
}

export interface UiSlotsReadTransport {
  fetchScreen(
    request: FetchUiSlotsScreenRequest,
  ): Promise<FetchUiSlotsScreenResult>;
}

export class UiSlotsHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`UI Slots API request failed with status ${status}.`);
    this.name = 'UiSlotsHttpError';
    this.status = status;
  }
}

export class UiSlotsInvalidResponseError extends Error {
  constructor() {
    super('UI Slots API returned an invalid response body.');
    this.name = 'UiSlotsInvalidResponseError';
  }
}

export class UiSlotsApiReadClient implements UiSlotsReadTransport {
  readonly #baseUrl: URL;
  readonly #clientVersion: string;
  readonly #fetch: typeof fetch;

  constructor({
    baseUrl,
    clientVersion,
    fetch: fetchFn = global.fetch,
  }: {
    baseUrl: string;
    clientVersion: string;
    fetch?: typeof fetch;
  }) {
    this.#baseUrl = new URL(baseUrl);
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
  }

  async fetchScreen({
    screenId,
    locale,
    etag,
    signal,
  }: FetchUiSlotsScreenRequest): Promise<FetchUiSlotsScreenResult> {
    const url = new URL(
      `v1/screens/${encodeURIComponent(screenId)}/slots`,
      this.#baseUrlWithTrailingSlash(),
    );
    url.searchParams.set('platform', 'mobile');

    const response = await this.#fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': locale,
        'x-metamask-clientproduct': 'metamask-mobile',
        'x-metamask-clientversion': this.#clientVersion,
        ...(etag ? { 'If-None-Match': etag } : {}),
      },
      signal,
    });

    if (response.status === 304) {
      return {
        status: 'not-modified',
        etag: response.headers.get('etag') ?? etag,
      };
    }

    if (!response.ok) {
      throw new UiSlotsHttpError(response.status);
    }

    try {
      return {
        status: 'modified',
        etag: response.headers.get('etag') ?? undefined,
        value: await response.json(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new UiSlotsInvalidResponseError();
    }
  }

  #baseUrlWithTrailingSlash(): URL {
    const url = new URL(this.#baseUrl.toString());
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/`;
    return url;
  }
}
