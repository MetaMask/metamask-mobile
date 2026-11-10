/**
 * KLIPY GIF client for the social post composer.
 *
 * The app key is `MM_KLIPY_API_KEY`. Locally it comes from `.js.env`. CI
 * injects the same name from the `builds.yml` secrets map. Metro inlines it
 * at bundle time, so restart the watcher after changing it.
 *
 * @see https://docs.klipy.com/getting-started
 * @see https://docs.klipy.com/gifs-api/gifs-search-api
 * @see https://docs.klipy.com/gifs-api/gifs-trending-api
 */

import { mapGifPage, toGifLocale, type Gif, type GifPage } from './gifPage';

const KLIPY_API_ORIGIN = 'https://api.klipy.com';
const KLIPY_PAGE_SIZE = 16;

export type KlipyGif = Gif;
export type KlipyGifPage = GifPage;
export const toKlipyLocale = toGifLocale;

export type KlipyApiErrorCode = 'missing_api_key' | 'request_failed';

export class KlipyApiError extends Error {
  readonly code: KlipyApiErrorCode;

  constructor(code: KlipyApiErrorCode) {
    super(code);
    this.name = 'KlipyApiError';
    this.code = code;
  }
}

export interface FetchKlipyGifsParams {
  query: string;
  page: number;
  locale: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

/** Read at call time so tests can pass `apiKey` without the inlined env var. */
export const getKlipyApiKey = (): string =>
  process.env.MM_KLIPY_API_KEY?.trim() ?? '';

export const mapKlipyGifPage = (body: unknown): KlipyGifPage => {
  try {
    return mapGifPage(body);
  } catch {
    throw new KlipyApiError('request_failed');
  }
};

/**
 * Trending GIFs when `query` is empty, otherwise keyword search.
 * `format_filter=gif` keeps the payload to the formats the composer renders.
 */
export const fetchKlipyGifs = async ({
  query,
  page,
  locale,
  apiKey = getKlipyApiKey(),
  fetchImpl = fetch,
}: FetchKlipyGifsParams): Promise<KlipyGifPage> => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new KlipyApiError('missing_api_key');
  }

  const trimmedQuery = query.trim();
  const resource = trimmedQuery ? 'gifs/search' : 'gifs/trending';
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(KLIPY_PAGE_SIZE),
    locale: toKlipyLocale(locale),
    content_filter: 'medium',
    format_filter: 'gif',
  });
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }

  const url = `${KLIPY_API_ORIGIN}/api/v1/${encodeURIComponent(trimmedKey)}/${resource}?${params.toString()}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new KlipyApiError('request_failed');
  }
  if (!response.ok) {
    throw new KlipyApiError('request_failed');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new KlipyApiError('request_failed');
  }
  return mapKlipyGifPage(body);
};
