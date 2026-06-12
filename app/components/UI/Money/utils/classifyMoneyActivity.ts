import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { isMusdToken } from '../../Earn/constants/musd';
import type {
  MoneyActivityTitleKey,
  MoneyActivityTransactionMeta,
} from '../constants/mockActivityData';

/**
 * The lifecycle state of a Money activity row, as far as the display cares.
 * In-flight transactions are `pending`, `failed` ones errored, and everything
 * else surfaced in activity is treated as `confirmed`.
 */
export type MoneyActivityStatus = 'pending' | 'confirmed' | 'failed';

export function getMoneyActivityStatus(
  tx: TransactionMeta,
): MoneyActivityStatus {
  switch (tx.status) {
    // `approved`/`signed` = user has confirmed but the tx is held by the
    // MetaMask Pay publish hook while a cross-chain payment (e.g. bridge)
    // completes — in-flight from the user's perspective, and the status the
    // tx keeps for nearly its whole pending life on cross-chain conversions.
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

/**
 * The semantic kind of a Money activity row, parsed once from a
 * {@link TransactionMeta} so the rest of the display layer renders from a
 * single well-typed value rather than re-deriving from raw transaction types.
 *
 * Mirrors the activity row types in the Money design (Converted / Deposited /
 * Received / Sent). Card transactions are not {@link TransactionMeta}-backed
 * and are classified separately — see `cardTransactionDisplayInfo` — but
 * `'card'` is kept here so the explicit `moneyActivityTitleKey` override can
 * still target it.
 */
export type MoneyActivityKind =
  | 'deposited'
  | 'received'
  | 'converted'
  | 'sent'
  | 'card';

const TITLE_KEY_TO_KIND: Record<MoneyActivityTitleKey, MoneyActivityKind> = {
  deposited: 'deposited',
  received: 'received',
  card_transaction: 'card',
  converted: 'converted',
  sent: 'sent',
};

/**
 * The most significant Money transaction type for `tx`. For EIP-7702 batches
 * (e.g. the approve+deposit / withdraw+transfer pairs) the meaningful type
 * lives on a nested call, so we surface that; otherwise the top-level type.
 */
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

/** A `moneyAccountDeposit` paid with mUSD itself (a top-up / move, not a conversion). */
function isMusdPayToken(tx: TransactionMeta): boolean {
  return isMusdToken(tx.metamaskPay?.tokenAddress);
}

/**
 * Parses a Money activity {@link TransactionMeta} into a single
 * {@link MoneyActivityKind}. An explicit `moneyActivityTitleKey` (mock or
 * enriched rows) always wins; otherwise the kind is derived from the
 * transaction type.
 *
 * A `moneyAccountDeposit` paid with crypto is a *conversion* into mUSD (shown
 * as e.g. "ETH → mUSD"), so it maps to `'converted'`. Fiat on-ramp deposits
 * (Transak) and mUSD top-ups keep the `'deposited'` label.
 */
export function classifyMoneyActivity(tx: TransactionMeta): MoneyActivityKind {
  const { moneyActivityTitleKey } = tx as MoneyActivityTransactionMeta;
  if (moneyActivityTitleKey) {
    return TITLE_KEY_TO_KIND[moneyActivityTitleKey] ?? 'received';
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
};

// Present-tense labels for in-flight rows (e.g. "Depositing"). Kinds without an
// entry fall back to their confirmed label.
const KIND_PENDING_LABEL_KEY: Partial<Record<MoneyActivityKind, string>> = {
  deposited: 'money.transaction.depositing',
  converted: 'money.transaction.converting',
  sent: 'money.transaction.sending',
  received: 'money.transaction.receiving',
};

// Failed-state labels. Stems differ from the confirmed form ("Converted" →
// "Conversion failed"), so they're enumerated rather than derived. Kinds
// without an entry fall back to their confirmed label.
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
      return IconName.Card;
    default:
      return IconName.Arrow2Down;
  }
}
