import {
  CHAIN_IDS,
  type TransactionMeta,
  type TransactionParams,
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
  | 'added'
  | 'deposited'
  | 'received'
  | 'card_transaction'
  | 'converted'
  | 'sent'
  | 'transferred';

/**
 * {@link TransactionMeta} plus optional Money activity presentation fields.
 */
export type MoneyActivityTransactionMeta = TransactionMeta & {
  moneySubtitle?: string;
  moneyActivityTitleKey?: MoneyActivityTitleKey;
};

// The Money Account lives on Monad — mock rows MUST be on this chain so the
// mUSD display path (`isMusdOnMoneyAccountChain`) resolves their amounts.
// Using mainnet here is what previously left every transferInformation-backed
// mock row blank.
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
  symbol?: string;
  moneySubtitle?: string;
  moneyActivityTitleKey?: MoneyActivityTitleKey;
}): MoneyActivityTransactionMeta {
  const {
    id,
    timestampSec,
    type,
    amount,
    symbol = MUSD_TOKEN.symbol,
    moneySubtitle,
    moneyActivityTitleKey,
  } = config;

  return {
    id,
    chainId: MOCK_CHAIN_ID,
    networkClientId: MOCK_NETWORK_CLIENT_ID,
    status: TransactionStatus.confirmed,
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

/** USD value → mUSD minimal units (6dp) as Hex, matching `requiredAssets[0].amount`. */
const usdToRequiredAssetHex = (usd: number): Hex =>
  `0x${Math.round(usd * 1e6).toString(16)}` as Hex;

/**
 * Builds a {@link TransactionType.moneyAccountDeposit} that mirrors a REAL MM Pay
 * deposit: NO `transferInformation` (that field is only populated by incoming
 * polling), with the USD-denominated (6dp) deposit target carried on
 * `requiredAssets[0].amount` and an optional `metamaskPay.targetFiat`. Use this
 * to reproduce the blank "Deposited" rows that appear when the pay-token
 * symbol/price can't be resolved.
 */
function makeMoneyDepositTx(config: {
  id: string;
  timestampSec: number;
  usdValue: number;
  status?: TransactionStatus;
  targetFiat?: string;
}): MoneyActivityTransactionMeta {
  const {
    id,
    timestampSec,
    usdValue,
    status = TransactionStatus.confirmed,
    targetFiat,
  } = config;

  return {
    id,
    chainId: MOCK_CHAIN_ID,
    networkClientId: MOCK_NETWORK_CLIENT_ID,
    status,
    time: timestampSec * 1000,
    txParams: defaultTxParams,
    type: TransactionType.moneyAccountDeposit,
    requiredAssets: [
      {
        address: MUSD_TOKEN_ADDRESS,
        amount: usdToRequiredAssetHex(usdValue),
        standard: 'erc20',
      },
    ],
    ...(targetFiat !== undefined ? { metamaskPay: { targetFiat } } : {}),
  };
}

const MOCK_MONEY_TRANSACTIONS: MoneyActivityTransactionMeta[] = [
  // Realistic MM Pay deposit: no `transferInformation`, value only on
  // `requiredAssets`, pay-token symbol/price unavailable. Renders blank before
  // the requiredAssets fallback in useMoneyTransactionDisplayInfo.
  makeMoneyDepositTx({
    id: 'money-tx-deposit-no-transfer-info',
    timestampSec: 1747095600,
    usdValue: 42.5,
  }),
  // Failed deposit with no resolved amount — renders with no value (expected).
  makeMoneyDepositTx({
    id: 'money-tx-deposit-failed',
    timestampSec: 1747095000,
    usdValue: 0,
    status: TransactionStatus.failed,
  }),
  makeMoneyTx({
    id: 'money-tx-1',
    timestampSec: 1747094400,
    type: TransactionType.moneyAccountDeposit,
    amount: '100000000',
    moneyActivityTitleKey: 'added',
  }),
  makeMoneyTx({
    id: 'money-tx-2',
    timestampSec: 1747090800,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    moneySubtitle: 'Transak',
    moneyActivityTitleKey: 'deposited',
  }),
  makeMoneyTx({
    id: 'money-tx-3',
    timestampSec: 1747087200,
    type: TransactionType.incoming,
    amount: '500000000',
    moneySubtitle: 'From: 0x23231...12345',
    moneyActivityTitleKey: 'received',
  }),
  makeMoneyTx({
    id: 'money-tx-4',
    timestampSec: 1747083600,
    type: TransactionType.moneyAccountWithdraw,
    amount: '10000000',
    moneyActivityTitleKey: 'card_transaction',
  }),
  makeMoneyTx({
    id: 'money-tx-5',
    timestampSec: 1746921600,
    type: TransactionType.musdConversion,
    amount: '300000000',
    moneySubtitle: 'USDC → mUSD',
    moneyActivityTitleKey: 'converted',
  }),
  makeMoneyTx({
    id: 'money-tx-6',
    timestampSec: 1746918000,
    type: TransactionType.moneyAccountWithdraw,
    amount: '250000000',
    moneySubtitle: 'mUSD → ETH',
    moneyActivityTitleKey: 'transferred',
  }),
];

export default MOCK_MONEY_TRANSACTIONS;

export {
  getMoneyActivityDateKeyUtc,
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
  isMoneyActivityTransaction,
} from './moneyActivityFilters';
