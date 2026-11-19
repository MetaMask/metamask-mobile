/**
 * HTTP mock for the Perps market details Holders tab.
 *
 * Intercepts the social holders route (`GET /api/v1/positions/:assetId`).
 * Component view tests cannot mock the holders query module, so the tab has
 * to read it off the network.
 */

import type { FeedItem } from '@metamask/social-controllers';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import AppConstants from '../../../app/core/AppConstants';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const HOLDERS_PATH = '/api/v1/positions/';

/**
 * Answers every holders request with `items` on a single page.
 *
 * @returns The decoded asset ids requested, in order, so a test can assert
 * which market the tab asked for.
 */
export function setupPerpsMarketHoldersApiMock(
  items: FeedItem[] = [],
): string[] {
  const requestedAssetIds: string[] = [];

  clearAllNockMocks();
  disableNetConnect();

  nock(AppConstants.SOCIAL_API_URL)
    .persist()
    .get((uri) => uri.includes(HOLDERS_PATH))
    .reply((uri) => {
      const [, encodedAssetId = ''] = uri.split(HOLDERS_PATH);
      requestedAssetIds.push(decodeURIComponent(encodedAssetId.split('?')[0]));
      return [200, { items, pagination: { hasMore: false } }];
    });

  return requestedAssetIds;
}

export function clearPerpsMarketHoldersApiMock(): void {
  teardownNock();
}
