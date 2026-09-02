import type { UiSlotsScreenId } from './types';
import { UI_SLOTS_REQUEST_TIMEOUT_MS } from './config';
import type { Json } from '@metamask/utils';

const encodeArtifactPart = (value: string): string =>
  encodeURIComponent(value).replace(
    /[.!'()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export type FetchUiSlotsScreenResult =
  | {
      status: 'modified';
      etag?: string;
      value: Json;
    }
  | {
      status: 'not-modified';
      etag?: string;
    };

export interface FetchUiSlotsScreenRequest {
  screenId: UiSlotsScreenId;
  locale: string;
  etag?: string;
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

export class UiSlotsTimeoutError extends Error {
  constructor() {
    super('UI Slots API request timed out.');
    this.name = 'UiSlotsTimeoutError';
  }
}

export const isRetryableUiSlotsError = (error: unknown): boolean =>
  error instanceof UiSlotsInvalidResponseError ||
  error instanceof UiSlotsTimeoutError ||
  (error instanceof UiSlotsHttpError
    ? error.status === 429 || error.status >= 500
    : error instanceof TypeError);

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
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/$/u, '')}/`;
    this.#baseUrl = url;
    this.#clientVersion = clientVersion;
    this.#fetch = fetchFn;
  }

  async fetchScreen({
    screenId,
    locale,
    etag,
  }: FetchUiSlotsScreenRequest): Promise<FetchUiSlotsScreenResult> {
    const url = new URL(
      `v1/config/ui-slots/${encodeArtifactPart(
        screenId,
      )}.${encodeArtifactPart(locale)}`,
      this.#baseUrl,
    );

    const requestController = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      requestController.abort();
    }, UI_SLOTS_REQUEST_TIMEOUT_MS);

    try {
      const response = await this.#fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Accept-Language': locale,
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': this.#clientVersion,
          ...(etag ? { 'If-None-Match': etag } : {}),
        },
        signal: requestController.signal,
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
          value: (await response.json()) as Json,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        throw new UiSlotsInvalidResponseError();
      }
    } catch (error) {
      if (timedOut) {
        throw new UiSlotsTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
