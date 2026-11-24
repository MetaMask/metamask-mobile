/**
 * Shared GIF page shape for the composer picker.
 *
 * Both the social API proxy and the direct provider client return this payload.
 */

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

export interface FetchGifPageParams {
  query: string;
  page: number;
  locale: string;
}

export class GifPageParseError extends Error {
  constructor() {
    super('request_failed');
    this.name = 'GifPageParseError';
  }
}

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
    throw new GifPageParseError();
  }
  const items = Array.isArray(body.data.data) ? body.data.data : [];
  return {
    gifs: items.map(mapGifItem).filter((gif): gif is Gif => gif !== null),
    hasNext: body.data.has_next === true,
  };
};
