import {
  type TransactionMeta,
  type TransactionParams,
  CHAIN_IDS,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type {
  MoneyActivityTitleKey,
  MoneyActivityTransactionMeta,
} from '../constants/moneyActivity';

/** Money account chain used by activity list unit fixtures. */
export const FIXTURE_CHAIN_ID = CHAIN_IDS.MONAD as Hex;

export const FIXTURE_NETWORK_CLIENT_ID = 'monad';

const defaultTxParams = {
  from: '0x0000000000000000000000000000000000000001',
  to: '0x0000000000000000000000000000000000000002',
  value: '0x0',
} as unknown as TransactionParams;

function makeMoneyTx(config: {
  id: string;
  /** Unix time in seconds. */
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
    chainId: FIXTURE_CHAIN_ID,
    networkClientId: FIXTURE_NETWORK_CLIENT_ID,
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

/**
 * Sample Money activity transactions for unit tests. Stable ids are asserted
 * via testIDs such as `activity-mock-tx-money-tx-converted`.
 */
const MONEY_ACTIVITY_TRANSACTIONS: MoneyActivityTransactionMeta[] = [
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
    id: 'money-tx-deposited-apple-pay',
    timestampSec: 1747004100,
    type: TransactionType.moneyAccountDeposit,
    amount: '1000000000',
    moneySubtitle: 'Apple Pay',
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

export default MONEY_ACTIVITY_TRANSACTIONS;
