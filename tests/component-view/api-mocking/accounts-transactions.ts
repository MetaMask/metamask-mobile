/**
 * Accounts API mock for component view tests.
 * Intercepts GET https://accounts.api.cx.metamask.io/v4/multiaccount/transactions
 *
 * Use in beforeEach/afterEach of ActivityList.view.test.tsx (or any view that
 * loads EVM transaction history from the accounts API).
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { restoreFetchPath, stubFetchPath } from './fetchStub';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const TRANSACTIONS_PATH = '/v4/multiaccount/transactions';
const moneyTransactionsPath = (address: string): string =>
  `/v1/accounts/${address}/transactions`;

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

const buildTransactionsResponse = (
  transactions: MockAccountsApiTransaction[],
) => ({
  data: transactions,
  pageInfo: {
    ...defaultPageInfo,
    count: transactions.length,
  },
});

export function setupAccountsTransactionsApiMock(
  transactions: MockAccountsApiTransaction[],
): void {
  clearAllNockMocks();
  disableNetConnect();

  const body = buildTransactionsResponse(transactions);

  nock(ACCOUNTS_API_ORIGIN)
    .persist()
    .get(TRANSACTIONS_PATH)
    .query(true)
    .reply(200, body);

  // Same payload as nock. undici fetch is not always settled by the interceptor.
  stubFetchPath(ACCOUNTS_API_ORIGIN, TRANSACTIONS_PATH, body);
}

export interface MockMoneyActivityTransaction {
  hash: string;
  timestamp: string;
  chainId: number;
  blockNumber?: number;
  from: string;
  to: string;
  isError?: boolean;
  transactionType?: string;
  methodId?: string;
  valueTransfers?: {
    from: string;
    to: string;
    amount: string;
    decimal: number;
    contractAddress: string;
    symbol: string;
  }[];
}

export function setupMoneyActivityApiMock(
  address: string,
  transactions: MockMoneyActivityTransaction[],
): void {
  clearAllNockMocks();
  disableNetConnect();

  const path = moneyTransactionsPath(address);
  const body = {
    data: transactions,
    pageInfo: {
      count: transactions.length,
      hasNextPage: false,
      cursor: undefined,
    },
  };

  nock(ACCOUNTS_API_ORIGIN).persist().get(path).query(true).reply(200, body);
  stubFetchPath(ACCOUNTS_API_ORIGIN, path, body);
}

export function clearAccountsTransactionsApiMocks(address?: string): void {
  restoreFetchPath(ACCOUNTS_API_ORIGIN, TRANSACTIONS_PATH);
  if (address) {
    restoreFetchPath(ACCOUNTS_API_ORIGIN, moneyTransactionsPath(address));
  }
  // Re-enable net connect so later suites in the same Jest worker are not left
  // blocked by disableNetConnect in setup.
  teardownNock();
}
