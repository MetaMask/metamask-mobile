import {
  type TransactionMeta,
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
 * The semantic kind of a Money activity row, parsed once from a
 * {@link TransactionMeta} so the rest of the display layer renders from a
 * single well-typed value rather than re-deriving from raw transaction types.
 *
 * Mirrors the activity row types in the Money design (Converted / Deposited /
 * Added / Received / Sent / Transferred). Card transactions are not
 * {@link TransactionMeta}-backed and are classified separately — see
 * `cardTransactionDisplayInfo` — but `'card'` is kept here so the explicit
 * `moneyActivityTitleKey` override can still target it.
 */
export type MoneyActivityKind =
  | 'added'
  | 'deposited'
  | 'received'
  | 'converted'
  | 'sent'
  | 'transferred'
  | 'card';

const TITLE_KEY_TO_KIND: Record<MoneyActivityTitleKey, MoneyActivityKind> = {
  added: 'added',
  deposited: 'deposited',
  received: 'received',
  card_transaction: 'card',
  converted: 'converted',
  sent: 'sent',
  transferred: 'transferred',
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

export function moneyActivityKindToLabel(kind: MoneyActivityKind): string {
  switch (kind) {
    case 'added':
      return strings('money.transaction.added');
    case 'deposited':
      return strings('money.transaction.deposited');
    case 'received':
      return strings('money.transaction.received');
    case 'converted':
      return strings('money.transaction.converted');
    case 'sent':
      return strings('money.transaction.sent');
    case 'transferred':
      return strings('money.transaction.transferred');
    case 'card':
      return strings('money.transaction.card_transaction');
    default:
      return strings('money.transaction.received');
  }
}

export function moneyActivityKindToIcon(kind: MoneyActivityKind): IconName {
  switch (kind) {
    case 'added':
    case 'deposited':
      return IconName.Add;
    case 'received':
      return IconName.Arrow2Down;
    case 'converted':
      return IconName.Refresh;
    case 'sent':
      return IconName.Arrow2UpRight;
    case 'transferred':
      return IconName.SwapHorizontal;
    case 'card':
      return IconName.Card;
    default:
      return IconName.Arrow2Down;
  }
}
