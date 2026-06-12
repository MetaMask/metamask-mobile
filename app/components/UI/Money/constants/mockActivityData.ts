import {
  type TransactionMeta,
  type TransactionParams,
  CHAIN_IDS,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';

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

// A QA fixture covering the full kind × status matrix from the MUSD-956 design.
// `type` drives the +/- sign and incoming colour; `moneyActivityTitleKey` pins
// the kind; `status` drives the label form (Depositing / Deposit failed / …)
// and the spinner; `moneySubtitle` supplies the subtitle text (the token
// registry isn't populated in mock mode, so we set it explicitly).
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

export {
  getMoneyActivityDateKeyUtc,
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
  isMoneyActivityTransaction,
} from './moneyActivityFilters';
