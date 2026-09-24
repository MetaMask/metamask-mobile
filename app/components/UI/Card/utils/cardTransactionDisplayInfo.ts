import { IconName, TextColor } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import type { MoneyTransactionDisplayInfo } from '../../Money/hooks/useMoneyTransactionDisplayInfo';
import type { MoneyActivityStatus } from '../../Money/utils/classifyMoneyActivity';
import { formatCardAmount } from './cardTransactionAmount';

const TYPE_LABEL_KEY: Record<CardTransactionType, string> = {
  [CardTransactionType.Purchase]: 'money.transaction.purchase',
  [CardTransactionType.Refund]: 'money.transaction.refund',
  [CardTransactionType.Withdrawal]: 'money.transaction.sent',
  [CardTransactionType.Deposit]: 'money.transaction.deposited',
  [CardTransactionType.Transfer]: 'money.transaction.sent',
  [CardTransactionType.Adjustment]: 'money.transaction.card_transaction',
};

const HERO_COPY_KEY: Partial<Record<CardTransactionType, string>> = {
  [CardTransactionType.Purchase]: 'money.api_activity_details.you_spent',
  [CardTransactionType.Refund]: 'money.api_activity_details.you_were_refunded',
  [CardTransactionType.Withdrawal]: 'card.transactions.you_withdrew',
  [CardTransactionType.Deposit]: 'card.transactions.you_deposited',
};

function startOfDayMs(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function formatCardTransactionDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const todayStart = startOfDayMs(now);
  const yesterdayStart = todayStart - 86_400_000;
  const dateStart = startOfDayMs(date);

  if (dateStart === todayStart) {
    return strings('card.transactions.today');
  }
  if (dateStart === yesterdayStart) {
    return strings('card.transactions.yesterday');
  }

  const isCurrentYear = date.getFullYear() === now.getFullYear();

  return getIntlDateTimeFormatter(I18n.locale, {
    day: 'numeric',
    month: 'short',
    ...(isCurrentYear ? {} : { year: 'numeric' as const }),
  }).format(date);
}

function mapCardTransactionStatus(
  status: CardTransactionStatus,
): MoneyActivityStatus {
  switch (status) {
    case CardTransactionStatus.Pending:
      return 'pending';
    case CardTransactionStatus.Failed:
      return 'failed';
    default:
      return 'confirmed';
  }
}

function getTransactionLabel(tx: CardTransaction): string {
  return strings(TYPE_LABEL_KEY[tx.type]);
}

function getTransactionDescription(tx: CardTransaction): string | undefined {
  if (tx.merchant?.name) {
    return tx.merchant.name;
  }
  if (tx.description) {
    return tx.description;
  }
  return formatCardTransactionDate(tx.timestamp);
}

function getLocalAmount(tx: CardTransaction) {
  const original = tx.originalAmount;
  if (
    !original ||
    original.currency.toUpperCase() === tx.billingAmount.currency.toUpperCase()
  ) {
    return undefined;
  }
  return original;
}

export function cardTransactionDisplayInfo(
  tx: CardTransaction,
): MoneyTransactionDisplayInfo {
  const localAmount = getLocalAmount(tx);
  const primary = localAmount ?? tx.billingAmount;
  const secondary = localAmount ? tx.billingAmount : undefined;

  return {
    label: getTransactionLabel(tx),
    description: getTransactionDescription(tx),
    primaryAmount: formatCardAmount(primary, tx.isDebit),
    fiatAmount: secondary ? formatCardAmount(secondary, tx.isDebit) : '',
    isIncoming: !tx.isDebit,
    icon: IconName.Card,
    status: mapCardTransactionStatus(tx.status),
  };
}

export function getCardTransactionTypeLabel(type: CardTransactionType): string {
  return strings(TYPE_LABEL_KEY[type]);
}

export function formatCardTransactionStatus(
  status: CardTransactionStatus,
): string {
  switch (status) {
    case CardTransactionStatus.Pending:
      return strings('card.transactions.pending');
    case CardTransactionStatus.Failed:
      return strings('money.transaction.failed');
    case CardTransactionStatus.Reversed:
      return strings('card.transactions.reversed');
    case CardTransactionStatus.Completed:
    default:
      return strings('card.transactions.completed');
  }
}

export function getCardTransactionHeroCopy(tx: CardTransaction): string {
  const key =
    HERO_COPY_KEY[tx.type] ??
    (tx.isDebit
      ? 'money.api_activity_details.you_spent'
      : 'card.transactions.you_received');
  return strings(key);
}

export function getCardTransactionStatusColor(
  status: CardTransactionStatus,
): TextColor {
  switch (status) {
    case CardTransactionStatus.Pending:
      return TextColor.WarningDefault;
    case CardTransactionStatus.Failed:
      return TextColor.ErrorDefault;
    case CardTransactionStatus.Reversed:
      return TextColor.TextAlternative;
    case CardTransactionStatus.Completed:
    default:
      return TextColor.SuccessDefault;
  }
}
