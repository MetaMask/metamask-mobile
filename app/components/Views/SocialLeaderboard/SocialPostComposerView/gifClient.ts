/**
 * GIF client for the social post composer.
 *
 * Trending and search go through SocialService, which calls the social-api
 * GIF proxy. The app does not hold a GIF provider API key.
 */

import type { GifQueryParams } from '@metamask/social-controllers';
import Engine from '../../../../core/Engine';
import {
  mapGifPage,
  toGifLocale,
  type FetchGifPageParams,
  type Gif,
  type GifPage,
} from './gifPage';

const GIF_PAGE_SIZE = 16;

export type { Gif, GifPage };

export type GifApiErrorCode = 'request_failed';

interface GifMessenger {
  call: (
    action: 'SocialService:fetchTrendingGifs' | 'SocialService:searchGifs',
    params: GifQueryParams,
  ) => Promise<unknown>;
}

const getMessenger = (): GifMessenger =>
  Engine.controllerMessenger as unknown as GifMessenger;

export class GifApiError extends Error {
  readonly code: GifApiErrorCode;

  constructor(code: GifApiErrorCode) {
    super(code);
    this.name = 'GifApiError';
    this.code = code;
  }
}

/**
 * Trending GIFs when `query` is empty, otherwise keyword search.
 * `format_filter=gif` keeps the payload to the formats the composer renders.
 */
export const fetchGifs = async ({
  query,
  page,
  locale,
}: FetchGifPageParams): Promise<GifPage> => {
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
