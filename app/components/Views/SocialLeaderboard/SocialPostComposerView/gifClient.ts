/**
 * GIF client for the social post composer.
 *
 * Trending and search go through SocialService, which calls the social-api
 * GIF proxy. The app does not hold a GIF provider API key.
 */

import Engine from '../../../../core/Engine';

const GIF_PAGE_SIZE = 16;

export type GifApiErrorCode = 'request_failed';

export class GifApiError extends Error {
  readonly code: GifApiErrorCode;

  constructor(code: GifApiErrorCode) {
    super(code);
    this.name = 'GifApiError';
    this.code = code;
  }
}

export interface Gif {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
}

export interface GifPage {
  gifs: Gif[];
  hasNext: boolean;
}

export interface FetchGifsParams {
  query: string;
  page: number;
  locale: string;
}

type GifQueryParams = Record<string, string | number | boolean | undefined>;

interface GifMessenger {
  call: (
    action: 'SocialService:fetchTrendingGifs' | 'SocialService:searchGifs',
    params: GifQueryParams,
  ) => Promise<unknown>;
}

const getMessenger = (): GifMessenger =>
  Engine.controllerMessenger as unknown as GifMessenger;

/**
 * Provider locale is an ISO 3166 alpha-2 country code (`us`, `de`). App locales
 * are language codes (`en`) or BCP 47 tags (`en-US`).
 */
export const toGifLocale = (locale: string): string => {
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readGifUrl = (size: unknown): string | undefined => {
  if (!isRecord(size) || !isRecord(size.gif)) {
    return undefined;
  }
  const { url } = size.gif;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
};

const mapGifItem = (item: unknown): Gif | null => {
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

export const mapGifPage = (body: unknown): GifPage => {
  if (!isRecord(body) || body.result !== true || !isRecord(body.data)) {
    throw new GifApiError('request_failed');
  }
  const items = Array.isArray(body.data.data) ? body.data.data : [];
  return {
    gifs: items.map(mapGifItem).filter((gif): gif is Gif => gif !== null),
    hasNext: body.data.has_next === true,
  };
};

/**
 * Trending GIFs when `query` is empty, otherwise keyword search.
 * `format_filter=gif` keeps the payload to the formats the composer renders.
 */
export const fetchGifs = async ({
  query,
  page,
  locale,
}: FetchGifsParams): Promise<GifPage> => {
  const trimmedQuery = query.trim();
  const params: GifQueryParams = {
    page,
    per_page: GIF_PAGE_SIZE,
    locale: toGifLocale(locale),
    content_filter: 'medium',
    format_filter: 'gif',
  };
  if (trimmedQuery) {
    params.q = trimmedQuery;
  }

  try {
    const body = trimmedQuery
      ? await getMessenger().call('SocialService:searchGifs', params)
      : await getMessenger().call('SocialService:fetchTrendingGifs', params);
    return mapGifPage(body);
  } catch (error) {
    if (error instanceof GifApiError) {
      throw error;
    }
    throw new GifApiError('request_failed');
  }
};
