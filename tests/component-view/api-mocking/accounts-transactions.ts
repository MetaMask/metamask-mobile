/**
 * Accounts API mock for component view tests.
 * Intercepts GET https://accounts.api.cx.metamask.io/v4/multiaccount/transactions
 *
 * Use in beforeEach/afterEach of ActivityList.view.test.tsx (or any view that
 * loads EVM transaction history from the accounts API).
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const TRANSACTIONS_PATH = '/v4/multiaccount/transactions';

export interface MockAccountsApiTransaction {
  hash: string;
  timestamp: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
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

export function clearAccountsTransactionsApiMocks(): void {
  clearAllNockMocks();
}
