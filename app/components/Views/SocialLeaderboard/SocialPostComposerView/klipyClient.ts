/**
 * KLIPY GIF client for the social post composer.
 *
 * The app key is `MM_KLIPY_API_KEY` in `.js.env`. Metro inlines it at bundle
 * time, so restart the watcher after changing it.
 *
 * @see https://docs.klipy.com/getting-started
 * @see https://docs.klipy.com/gifs-api/gifs-search-api
 * @see https://docs.klipy.com/gifs-api/gifs-trending-api
 */

const KLIPY_API_ORIGIN = 'https://api.klipy.com';
const KLIPY_PAGE_SIZE = 16;

export type KlipyApiErrorCode = 'missing_api_key' | 'request_failed';

export class KlipyApiError extends Error {
  readonly code: KlipyApiErrorCode;

  constructor(code: KlipyApiErrorCode) {
    super(code);
    this.name = 'KlipyApiError';
    this.code = code;
  }
}

export interface KlipyGif {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
}

export interface KlipyGifPage {
  gifs: KlipyGif[];
  hasNext: boolean;
}

export interface FetchKlipyGifsParams {
  query: string;
  page: number;
  locale: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

/**
 * KLIPY locale is an ISO 3166 alpha-2 country code (`us`, `de`). App locales
 * are language codes (`en`) or BCP 47 tags (`en-US`).
 */
export const toKlipyLocale = (locale: string): string => {
  const [, region] = locale.split(/[-_]/);
  if (region && /^[a-zA-Z]{2}$/.test(region)) {
    return region.toLowerCase();
  }
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? '';
  if (language === 'en' || language.length !== 2) {
    return 'us';
  }
  return language;
};

/** Read at call time so tests can pass `apiKey` without the inlined env var. */
export const getKlipyApiKey = (): string =>
  process.env.MM_KLIPY_API_KEY?.trim() ?? '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readGifUrl = (size: unknown): string | undefined => {
  if (!isRecord(size) || !isRecord(size.gif)) {
    return undefined;
  }
  const { url } = size.gif;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
};

const mapKlipyItem = (item: unknown): KlipyGif | null => {
  if (!isRecord(item) || !isRecord(item.file)) {
    return null;
  }
  const { file } = item;
  const previewUrl =
    readGifUrl(file.sm) ?? readGifUrl(file.xs) ?? readGifUrl(file.md);
  const gifUrl = readGifUrl(file.md) ?? readGifUrl(file.hd) ?? previewUrl;
  if (!previewUrl || !gifUrl) {
    return null;
  }
  const idSource = item.id ?? item.slug ?? previewUrl;
  const title =
    typeof item.title === 'string' && item.title.trim().length > 0
      ? item.title.trim()
      : '';
  return {
    id: String(idSource),
    title,
    previewUrl,
    gifUrl,
  };
};

export const mapKlipyGifPage = (body: unknown): KlipyGifPage => {
  if (!isRecord(body) || body.result !== true || !isRecord(body.data)) {
    throw new KlipyApiError('request_failed');
  }
  const items = Array.isArray(body.data.data) ? body.data.data : [];
  return {
    gifs: items
      .map(mapKlipyItem)
      .filter((gif): gif is KlipyGif => gif !== null),
    hasNext: body.data.has_next === true,
  };
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
