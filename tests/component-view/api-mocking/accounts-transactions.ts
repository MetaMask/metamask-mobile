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

let fetchSpyInstalled = false;

const requestUrl = (url: RequestInfo | URL): string => {
  if (typeof url === 'string') {
    return url;
  }
  if (url instanceof URL) {
    return url.toString();
  }
  return url.url;
};

/**
 * `useTransactionsQuery` calls global `fetch` (undici). A nock interceptor
 * does not always settle that request, so `isInitialLoading` stays true and
 * the Activity list spinner never leaves. Reply on this path directly and
 * keep nock for any HTTP client that does not use `fetch`.
 */
const installTransactionsFetchStub = (
  transactions: MockAccountsApiTransaction[],
): void => {
  if (fetchSpyInstalled) {
    jest.mocked(globalThis.fetch).mockRestore();
    fetchSpyInstalled = false;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  const body = {
    data: transactions,
    pageInfo: {
      ...defaultPageInfo,
      count: transactions.length,
    },
  };

  jest.spyOn(globalThis, 'fetch').mockImplementation((url, init) => {
    if (requestUrl(url).includes(TRANSACTIONS_PATH)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(body),
      } as Response);
    }
    return originalFetch(url, init);
  });
  fetchSpyInstalled = true;
};

const restoreTransactionsFetchStub = (): void => {
  if (!fetchSpyInstalled) {
    return;
  }
  jest.mocked(globalThis.fetch).mockRestore();
  fetchSpyInstalled = false;
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

  installTransactionsFetchStub(transactions);
}

export function clearAccountsTransactionsApiMocks(): void {
  restoreTransactionsFetchStub();
  // Re-enable net connect so later suites in the same Jest worker are not left
  // blocked by disableNetConnect from setup.
  teardownNock();
}
