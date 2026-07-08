import {
  type TransactionMeta,
  type TransactionParams,
  CHAIN_IDS,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { AccountsApiActivity } from '../types/moneyActivity';

export type MoneyActivityFilterType = 'deposit' | 'transfer';

export enum MoneyActivityFilter {
  All = 'all',
  Deposits = 'deposits',
  Transfers = 'transfers',
}

/**
 * When set on mock or enriched {@link TransactionMeta}, overrides the default title from {@link TransactionType}.
 */
export type MoneyActivityTitleKey =
  | 'deposited'
  | 'received'
  | 'card_transaction'
  | 'converted'
  | 'sent';

/**
 * {@link TransactionMeta} plus optional Money activity presentation fields.
 */
export type MoneyActivityTransactionMeta = TransactionMeta & {
  moneySubtitle?: string;
  moneyActivityTitleKey?: MoneyActivityTitleKey;
};

// mUSD activity is gated to the Money Account chain (Monad). Using Monad here
// lets the mUSD amount resolve through the normal `transferInformation` path so
// mock rows render real "+/-X.XX mUSD" amounts.
export const MOCK_CHAIN_ID = CHAIN_IDS.MONAD as Hex;

export const MOCK_NETWORK_CLIENT_ID = 'monad';

const defaultTxParams = {
  from: '0x0000000000000000000000000000000000000001',
  to: '0x0000000000000000000000000000000000000002',
  value: '0x0',
} as unknown as TransactionParams;

function makeMoneyTx(config: {
  id: string;
  /** Unix time in seconds (matches historical mock JSON). */
  timestampSec: number;
  type: TransactionType;
  amount: string;
  status?: TransactionStatus;
  symbol?: string;
  moneySubtitle?: string;
  moneyActivityTitleKey?: MoneyActivityTitleKey;
}): MoneyActivityTransactionMeta {
  const {
    id,
    timestampSec,
    type,
    amount,
    status = TransactionStatus.confirmed,
    symbol = MUSD_TOKEN.symbol,
    moneySubtitle,
    moneyActivityTitleKey,
  } = config;

  return {
    id,
    chainId: MOCK_CHAIN_ID,
    networkClientId: MOCK_NETWORK_CLIENT_ID,
    status,
    time: timestampSec * 1000,
    txParams: defaultTxParams,
    type,
    transferInformation: {
      amount,
      contractAddress: MUSD_TOKEN_ADDRESS,
      decimals: MUSD_TOKEN.decimals,
      symbol,
    },
    ...(moneySubtitle !== undefined ? { moneySubtitle } : {}),
    ...(moneyActivityTitleKey !== undefined ? { moneyActivityTitleKey } : {}),
  };
}

const MOCK_MONEY_TRANSACTIONS: MoneyActivityTransactionMeta[] = [
  // --- Pending (in-flight): present-tense label + spinner ---
  makeMoneyTx({
    id: 'money-tx-depositing',
    timestampSec: 1747094400,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    status: TransactionStatus.submitted,
    moneySubtitle: 'Transak',
    moneyActivityTitleKey: 'deposited',
  }),
  makeMoneyTx({
    id: 'money-tx-converting',
    timestampSec: 1747094100,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    status: TransactionStatus.submitted,
    moneySubtitle: 'ETH → mUSD',
    moneyActivityTitleKey: 'converted',
  }),
  makeMoneyTx({
    id: 'money-tx-sending',
    timestampSec: 1747093800,
    type: TransactionType.moneyAccountWithdraw,
    amount: '250000000',
    status: TransactionStatus.submitted,
    moneySubtitle: 'mUSD → USDC',
    moneyActivityTitleKey: 'sent',
  }),

  // --- Failed: red "<action> failed" label, subtitle preserved, zero amount ---
  makeMoneyTx({
    id: 'money-tx-deposit-failed',
    timestampSec: 1747090800,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    status: TransactionStatus.failed,
    moneySubtitle: 'Transak',
    moneyActivityTitleKey: 'deposited',
  }),
  makeMoneyTx({
    id: 'money-tx-conversion-failed',
    timestampSec: 1747090500,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    status: TransactionStatus.failed,
    moneySubtitle: 'USDC → mUSD',
    moneyActivityTitleKey: 'converted',
  }),
  makeMoneyTx({
    id: 'money-tx-send-failed',
    timestampSec: 1747090200,
    type: TransactionType.moneyAccountWithdraw,
    amount: '250000000',
    status: TransactionStatus.failed,
    moneySubtitle: 'mUSD → USDC',
    moneyActivityTitleKey: 'sent',
  }),

  // --- Confirmed ---
  makeMoneyTx({
    id: 'money-tx-converted',
    timestampSec: 1747008000,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    moneySubtitle: 'USDC → mUSD',
    moneyActivityTitleKey: 'converted',
  }),
  makeMoneyTx({
    id: 'money-tx-deposited-fiat',
    timestampSec: 1747004400,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    moneySubtitle: 'Transak',
    moneyActivityTitleKey: 'deposited',
  }),
  makeMoneyTx({
    id: 'money-tx-deposited-musd',
    timestampSec: 1747000800,
    type: TransactionType.moneyAccountDeposit,
    amount: '500000000',
    moneySubtitle: 'mUSD',
    moneyActivityTitleKey: 'deposited',
  }),
  makeMoneyTx({
    id: 'money-tx-received',
    timestampSec: 1746997200,
    type: TransactionType.incoming,
    amount: '1000000000',
    moneySubtitle: 'From: 0x23231...12345',
    moneyActivityTitleKey: 'received',
  }),
  makeMoneyTx({
    id: 'money-tx-sent',
    timestampSec: 1746993600,
    type: TransactionType.moneyAccountWithdraw,
    amount: '250000000',
    moneySubtitle: 'mUSD → USDC',
    moneyActivityTitleKey: 'sent',
  }),
];

export default MOCK_MONEY_TRANSACTIONS;

/**
 * Mock Accounts-API activity for QA: a card spend (outflow, under Transfers) and
 * a cashback reward (inflow, under Deposits). These come from the Accounts API,
 * a separate source from on-chain txns, so they aren't part of
 * MOCK_MONEY_TRANSACTIONS — MoneyActivityView merges them in when mock data is
 * enabled.
 */
export const MOCK_API_ACTIVITY: AccountsApiActivity[] = [
  {
    kind: 'card',
    hash: '0xca5d000000000000000000000000000000000000000000000000000000000001',
    time: 1747005600 * 1000,
    chainId: MOCK_CHAIN_ID,
    token: {
      address: MUSD_TOKEN_ADDRESS,
      symbol: MUSD_TOKEN.symbol,
      decimals: MUSD_TOKEN.decimals,
    },
    amount: '10000000', // 10.00 mUSD → "-10.00 mUSD"
    paidTo: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e',
  },
  {
    kind: 'cashback',
    hash: '0xca5b000000000000000000000000000000000000000000000000000000000001',
    time: 1747002000 * 1000,
    chainId: MOCK_CHAIN_ID,
    token: {
      address: MUSD_TOKEN_ADDRESS,
      symbol: MUSD_TOKEN.symbol,
      decimals: MUSD_TOKEN.decimals,
    },
    amount: '300000', // 0.30 mUSD → "+0.30 mUSD"
    receivedFrom: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e',
  },
];

export {
  getMoneyActivityDateKeyUtc,
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
  isMoneyActivityTransaction,
} from './moneyActivityFilters';
