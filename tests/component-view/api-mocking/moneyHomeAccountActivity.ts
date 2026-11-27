/**
 * Money home activity HTTP mock for component view tests.
 * Intercepts GET https://accounts.api.cx.metamask.io/v1/accounts/:address/transactions
 * (`apiClient.accounts.fetchV1AccountTransactions`) with an empty page.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const V1_ACCOUNT_TRANSACTIONS_PATH = /\/v1\/accounts\/[^/]+\/transactions$/;

const EMPTY_V1_ACCOUNT_TRANSACTIONS: V1AccountTransactionsResponse = {
  data: [],
  pageInfo: { count: 0, hasNextPage: false },
};

export function setupMoneyHomeAccountActivityApiMock(): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(ACCOUNTS_API_ORIGIN)
    .persist()
    .get(V1_ACCOUNT_TRANSACTIONS_PATH)
    .query(true)
    .reply(200, EMPTY_V1_ACCOUNT_TRANSACTIONS);
}

export function clearMoneyHomeAccountActivityApiMocks(): void {
  teardownNock();
}
