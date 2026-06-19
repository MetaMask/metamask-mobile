import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { isMusdToken } from '../../Earn/constants/musd';
import {
  isPerpsPredictMoneyDeposit,
  isPerpsPredictMoneyWithdraw,
} from './moneyTransactionGuards';
import type {
  MoneyActivityTitleKey,
  MoneyActivityTransactionMeta,
} from '../constants/mockActivityData';

export type MoneyActivityStatus = 'pending' | 'confirmed' | 'failed';

export function getMoneyActivityStatus(
  tx: TransactionMeta,
): MoneyActivityStatus {
  switch (tx.status) {
    // `approved`/`signed` = user has confirmed but the tx is held by the
    // MetaMask Pay publish hook while a cross-chain payment (e.g. bridge)
    // completes — in-flight from the user's perspective.
    case TransactionStatus.approved:
    case TransactionStatus.signed:
    case TransactionStatus.submitted:
      return 'pending';
    case TransactionStatus.failed:
      return 'failed';
    default:
      return 'confirmed';
  }
}

export type MoneyActivityKind =
  | 'deposited'
  | 'received'
  | 'converted'
  | 'sent'
  | 'card'
  | 'cashback';

const TITLE_KEY_TO_KIND: Record<MoneyActivityTitleKey, MoneyActivityKind> = {
  deposited: 'deposited',
  received: 'received',
  card_transaction: 'card',
  converted: 'converted',
  sent: 'sent',
};

function resolveMoneyTransactionType(
  tx: TransactionMeta,
): TransactionType | undefined {
  if (tx.type === TransactionType.batch) {
    const nestedMoneyType = tx.nestedTransactions?.find(
      (nested) =>
        nested.type === TransactionType.moneyAccountDeposit ||
        nested.type === TransactionType.moneyAccountWithdraw,
    )?.type;
    if (nestedMoneyType) {
      return nestedMoneyType;
    }
  }
  return tx.type;
}

/** A `moneyAccountDeposit` funded by a fiat on-ramp (e.g. Transak), not crypto. */
function isFiatDeposit(tx: TransactionMeta): boolean {
  return Boolean(tx.metamaskPay?.fiat);
}

/** A `moneyAccountDeposit` paid with mUSD itself. */
function isMusdPayToken(tx: TransactionMeta): boolean {
  return isMusdToken(tx.metamaskPay?.tokenAddress);
}

export function classifyMoneyActivity(tx: TransactionMeta): MoneyActivityKind {
  const { moneyActivityTitleKey } = tx as MoneyActivityTransactionMeta;
  if (moneyActivityTitleKey) {
    return TITLE_KEY_TO_KIND[moneyActivityTitleKey] ?? 'received';
  }

  // Perps/Predict ↔ Money transfers (matched via the mUSD pay token). Withdraw
  // into the Money account reads as a deposit; deposit out of it reads as sent.
  if (isPerpsPredictMoneyWithdraw(tx)) {
    return 'deposited';
  }
  if (isPerpsPredictMoneyDeposit(tx)) {
    return 'sent';
  }

  const type = resolveMoneyTransactionType(tx);
  if (!type) {
    return 'deposited';
  }

  switch (type) {
    case TransactionType.moneyAccountDeposit:
      if (isFiatDeposit(tx) || isMusdPayToken(tx)) {
        return 'deposited';
      }
      return 'converted';
    case TransactionType.musdConversion:
      return 'converted';
    case TransactionType.incoming:
    case TransactionType.tokenMethodTransfer:
    case TransactionType.tokenMethodTransferFrom:
      return 'received';
    case TransactionType.moneyAccountWithdraw:
    case TransactionType.simpleSend:
      return 'sent';
    default:
      return 'received';
  }
}

const KIND_LABEL_KEY: Record<MoneyActivityKind, string> = {
  deposited: 'money.transaction.deposited',
  received: 'money.transaction.received',
  converted: 'money.transaction.converted',
  sent: 'money.transaction.sent',
  card: 'money.transaction.card_transaction',
  cashback: 'money.transaction.cashback',
};

// Present-tense labels for in-flight rows (e.g. "Depositing"). If there's
// no entry we will fall back to the confirmed.
const KIND_PENDING_LABEL_KEY: Partial<Record<MoneyActivityKind, string>> = {
  deposited: 'money.transaction.depositing',
  converted: 'money.transaction.converting',
  sent: 'money.transaction.sending',
  received: 'money.transaction.receiving',
};

// Failed-state labels.
// Kinds without an entry fall back to their confirmed label.
const KIND_FAILED_LABEL_KEY: Partial<Record<MoneyActivityKind, string>> = {
  deposited: 'money.transaction.deposit_failed',
  converted: 'money.transaction.conversion_failed',
  sent: 'money.transaction.send_failed',
};

export function moneyActivityLabel(
  kind: MoneyActivityKind,
  status: MoneyActivityStatus,
): string {
  const statusKey =
    status === 'pending'
      ? KIND_PENDING_LABEL_KEY[kind]
      : status === 'failed'
        ? KIND_FAILED_LABEL_KEY[kind]
        : undefined;
  return strings(statusKey ?? KIND_LABEL_KEY[kind]);
}

export function moneyActivityKindToIcon(kind: MoneyActivityKind): IconName {
  switch (kind) {
    case 'deposited':
      return IconName.Add;
    case 'received':
      return IconName.Arrow2Down;
    case 'converted':
      return IconName.Refresh;
    case 'sent':
      return IconName.Arrow2UpRight;
    case 'card':
    case 'cashback':
      return IconName.Card;
    default:
      return IconName.Arrow2Down;
  }
}
