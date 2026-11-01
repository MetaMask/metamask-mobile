/**
 * Accounts API mock for component view tests.
 * Intercepts GET https://accounts.api.cx.metamask.io/v4/multiaccount/transactions
 *
 * Use in beforeEach/afterEach of ActivityList.view.test.tsx (or any view that
 * loads EVM transaction history from the accounts API).
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const TRANSACTIONS_PATH = '/v4/multiaccount/transactions';
const V1_ACCOUNT_TRANSACTIONS_PATH = /\/v1\/accounts\/[^/]+\/transactions$/;

export interface MockAccountsApiTransaction {
  hash: string;
  timestamp: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  gasUsed?: number;
  effectiveGasPrice?: number;
  valueTransfers?: unknown[];
  isError?: boolean;
  transactionCategory?: string;
}

const defaultPageInfo = {
  count: 1,
  hasNextPage: false,
  endCursor: undefined as string | undefined,
};

export function setupAccountsTransactionsApiMock(
  transactions: MockAccountsApiTransaction[],
): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(ACCOUNTS_API_ORIGIN)
    .persist()
    .get(TRANSACTIONS_PATH)
    .query(true)
    .reply(200, {
      data: transactions,
      pageInfo: {
        ...defaultPageInfo,
        count: transactions.length,
      },
    });
}

/**
 * Empty page for Money home's v1 account-transactions read
 * (`apiClient.accounts.fetchV1AccountTransactions`).
 */
export function setupV1AccountTransactionsApiMock(): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(ACCOUNTS_API_ORIGIN)
    .persist()
    .get(V1_ACCOUNT_TRANSACTIONS_PATH)
    .query(true)
    .reply(200, {
      data: [],
      pageInfo: {
        count: 0,
        hasNextPage: false,
      },
    });
}

export function clearAccountsTransactionsApiMocks(): void {
  // Re-enable net connect so later suites in the same Jest worker are not left
  // blocked by disableNetConnect from setup.
  teardownNock();
}
