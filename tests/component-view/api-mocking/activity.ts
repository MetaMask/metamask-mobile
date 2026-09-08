// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const TOKEN_API_ORIGIN = 'https://tokens.api.cx.metamask.io';
const TOKEN_API_ASSETS_PATH = '/v3/assets';

interface ActivityTokenMetadata {
  assetId: string;
  decimals: number;
  iconUrl: string;
  name: string;
  symbol: string;
}

let tokenApiScope: nock.Scope | undefined;

/**
 * Makes Activity Details token enrichment deterministic and prevents CV tests
 * from depending on the live tokens API.
 */
export function setupActivityTokenApiMock(
  tokenMetadata: ActivityTokenMetadata[],
): void {
  clearAllNockMocks();
  disableNetConnect();

  tokenApiScope = nock(TOKEN_API_ORIGIN)
    .get(TOKEN_API_ASSETS_PATH)
    .query(true)
    .reply(200, tokenMetadata)
    .persist();
}

export function isActivityTokenApiMockDone(): boolean {
  return tokenApiScope?.isDone() ?? false;
}

export function clearActivityTokenApiMocks(): void {
  tokenApiScope = undefined;
  teardownNock();
}
