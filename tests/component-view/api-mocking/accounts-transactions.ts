/**
 * Accounts API mock for component view tests.
 * Intercepts GET https://accounts.api.cx.metamask.io/v5/multiaccount/transactions
 *
 * Use in beforeEach/afterEach of ActivityList.view.test.tsx (or any view that
 * loads EVM transaction history from the accounts API).
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import type { V5TransactionRecord } from '@metamask/core-backend';
import { restoreFetchPath, stubFetchPath } from './fetchStub';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const TRANSACTIONS_PATH = '/v5/multiaccount/transactions';

export interface MockAccountsApiTransaction {
  hash: string;
  timestamp: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  gasUsed?: number;
  effectiveGasPrice?: number;
  valueTransfers?: {
    from: string;
    to: string;
    amount?: string;
    symbol?: string;
    decimal?: number;
    name?: string;
    contractAddress?: string;
    transferType?: string;
    tokenId?: string;
  }[];
  isError?: boolean;
  transactionCategory?: string;
  transactionProtocol?: string;
  methodId?: string;
}

const defaultPageInfo = {
  count: 1,
  hasNextPage: false,
  endCursor: undefined as string | undefined,
};

function inferAssetClass(transferType?: string): 'ft' | 'nft' {
  const normalized = transferType?.toLowerCase() ?? '';
  if (normalized.includes('721') || normalized === 'erc721') {
    return 'nft';
  }
  return 'ft';
}

function toCaipAssetId(
  chainId: number,
  transfer: NonNullable<MockAccountsApiTransaction['valueTransfers']>[number],
) {
  const chain = `eip155:${chainId}`;
  if (transfer.contractAddress) {
    const assetClass = inferAssetClass(transfer.transferType);
    if (assetClass === 'nft') {
      return `${chain}/erc721:${transfer.contractAddress}`;
    }
    return `${chain}/erc20:${transfer.contractAddress}`;
  }
  return `${chain}/slip44:60`;
}

function toV5TransactionRecord(
  transaction: MockAccountsApiTransaction,
): V5TransactionRecord {
  const chainId = `eip155:${transaction.chainId}`;
  const subject =
    transaction.from.toLowerCase() < transaction.to.toLowerCase()
      ? transaction.from
      : transaction.to;

  return {
    accountId: `eip155:0:${subject}`,
    tx: {
      id: transaction.hash,
      chainId,
      status: transaction.isError ? 'failed' : 'confirmed',
      timestamp: new Date(transaction.timestamp).getTime(),
      date: transaction.timestamp,
      from: transaction.from,
      to: transaction.to,
      blockNumber: '1',
      blockHash: '0xblock',
      value: transaction.value,
      methodId: transaction.methodId,
      transactionCategory: transaction.transactionCategory,
      transactionProtocol: transaction.transactionProtocol,
    },
    valueTransfers: (transaction.valueTransfers ?? []).map((transfer) => ({
      assetClass: inferAssetClass(transfer.transferType),
      from: transfer.from,
      to: transfer.to,
      assetId: toCaipAssetId(transaction.chainId, transfer),
      amount: transfer.amount,
      decimal: transfer.decimal,
      symbol: transfer.symbol,
      name: transfer.name,
      tokenId: transfer.tokenId,
    })),
    fee: null,
  };
}

const buildTransactionsResponse = (
  transactions: MockAccountsApiTransaction[],
) => ({
  data: transactions.map(toV5TransactionRecord),
  pageInfo: {
    ...defaultPageInfo,
    count: transactions.length,
  },
  unprocessedAccounts: [],
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

export function clearAccountsTransactionsApiMocks(): void {
  restoreFetchPath(ACCOUNTS_API_ORIGIN, TRANSACTIONS_PATH);
  // Re-enable net connect so later suites in the same Jest worker are not left
  // blocked by disableNetConnect from setup.
  teardownNock();
}
