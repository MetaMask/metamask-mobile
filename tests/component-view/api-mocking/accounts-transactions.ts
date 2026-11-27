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
import {
  KnownCaipNamespace,
  toCaipAccountId,
  toCaipAssetType,
  toCaipChainId,
} from '@metamask/utils';
import {
  CARD_BLOCK_NUMBER,
  CARD_TX_HASH,
  CASHBACK_TX_HASH,
} from '../../../app/components/UI/Money/__fixtures__/vaultShareValuations';
import { ACTIVITY_CV_ACCOUNT } from '../presets/activity';
import {
  MONEY_ACTIVITY_ACCOUNT,
  MONEY_PREMIUM_VAULT,
  MONEY_STANDARD_VAULT,
} from '../presets/moneyActivity';
import { restoreFetchPath, stubFetchPath } from './fetchStub';
import { installDefaultApiMocks } from './defaults';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const TRANSACTIONS_PATH = '/v5/multiaccount/transactions';
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

function toValueTransferAssetType(
  chainId: number,
  transfer: NonNullable<MockAccountsApiTransaction['valueTransfers']>[number],
) {
  const reference = String(chainId);
  if (transfer.contractAddress) {
    const assetClass = inferAssetClass(transfer.transferType);
    return toCaipAssetType(
      KnownCaipNamespace.Eip155,
      reference,
      assetClass === 'nft' ? 'erc721' : 'erc20',
      transfer.contractAddress,
    );
  }
  return toCaipAssetType(KnownCaipNamespace.Eip155, reference, 'slip44', '60');
}

function toV5TransactionRecord(
  transaction: MockAccountsApiTransaction,
  subjectAddress: string,
): V5TransactionRecord {
  const chainId = toCaipChainId(
    KnownCaipNamespace.Eip155,
    String(transaction.chainId),
  );

  return {
    accountId: toCaipAccountId(KnownCaipNamespace.Eip155, '0', subjectAddress),
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
      assetId: toValueTransferAssetType(transaction.chainId, transfer),
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
  subjectAddress: string,
) => ({
  data: transactions.map((transaction) =>
    toV5TransactionRecord(transaction, subjectAddress),
  ),
  pageInfo: {
    ...defaultPageInfo,
    count: transactions.length,
  },
  unprocessedAccounts: [],
});

function mockAccountsApiGet(path: string, body: object): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(ACCOUNTS_API_ORIGIN).persist().get(path).query(true).reply(200, body);
  // Same payload as nock. undici fetch is not always settled by the interceptor.
  stubFetchPath(ACCOUNTS_API_ORIGIN, path, body);
  installDefaultApiMocks();
}

export function setupAccountsTransactionsApiMock(
  transactions: MockAccountsApiTransaction[],
  subjectAddress = ACTIVITY_CV_ACCOUNT,
): void {
  mockAccountsApiGet(
    TRANSACTIONS_PATH,
    buildTransactionsResponse(transactions, subjectAddress),
  );
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

const SETTLEMENT_ADDRESS = '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e';
const REWARDER_ADDRESS = '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0';

export function cardTransaction(): MockMoneyActivityTransaction {
  return {
    hash: CARD_TX_HASH,
    timestamp: '2026-09-29T07:17:22Z',
    chainId: 143,
    blockNumber: CARD_BLOCK_NUMBER,
    from: MONEY_ACTIVITY_ACCOUNT,
    to: SETTLEMENT_ADDRESS,
    transactionType: 'METAMASK_CARD_PAYMENT',
    valueTransfers: [
      {
        from: MONEY_ACTIVITY_ACCOUNT,
        to: SETTLEMENT_ADDRESS,
        amount: '951755696',
        decimal: 6,
        contractAddress: MONEY_STANDARD_VAULT.boringVault,
        symbol: 'vmUSD',
      },
    ],
  };
}

export function cashbackTransaction(): MockMoneyActivityTransaction {
  return {
    hash: CASHBACK_TX_HASH,
    timestamp: '2026-09-25T13:13:36Z',
    chainId: 143,
    blockNumber: 107901997,
    from: REWARDER_ADDRESS,
    to: MONEY_ACTIVITY_ACCOUNT,
    transactionType: 'METAMASK_CARD_CASHBACK',
    valueTransfers: [
      {
        from: REWARDER_ADDRESS,
        to: MONEY_ACTIVITY_ACCOUNT,
        amount: '524978000',
        decimal: 6,
        contractAddress: MONEY_PREMIUM_VAULT.boringVault,
        symbol: 'pvmUSD',
      },
    ],
  };
}

export function setupMoneyActivityApiMock(
  address: string,
  transactions: MockMoneyActivityTransaction[],
): void {
  mockAccountsApiGet(moneyTransactionsPath(address), {
    data: transactions,
    pageInfo: {
      count: transactions.length,
      hasNextPage: false,
      cursor: undefined,
    },
  });
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
