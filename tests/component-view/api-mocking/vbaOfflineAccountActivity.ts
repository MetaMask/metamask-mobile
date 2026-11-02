/**
 * Money home activity HTTP mock for offline component view tests.
 * GET https://accounts.api.cx.metamask.io/v1/accounts/:address/transactions
 * (`apiClient.accounts.fetchV1AccountTransactions`) fails at the socket, the
 * way a request does with no connectivity.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const V1_ACCOUNT_TRANSACTIONS_PATH = /\/v1\/accounts\/[^/]+\/transactions$/;

/**
 * Makes every Money home activity request fail with a network error.
 *
 * @returns The nock scope, so a test can check the request was made.
 */
export function setupOfflineAccountActivityApiMock(): nock.Scope {
  clearAllNockMocks();
  disableNetConnect();

  return nock(ACCOUNTS_API_ORIGIN)
    .persist()
    .get(V1_ACCOUNT_TRANSACTIONS_PATH)
    .query(true)
    .replyWithError({ code: 'ENOTFOUND', message: 'Network request failed' });
}

export function clearOfflineAccountActivityApiMocks(): void {
  teardownNock();
}
