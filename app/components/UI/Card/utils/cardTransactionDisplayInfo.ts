import { IconName } from '@metamask/design-system-react-native';
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

  return getIntlDateTimeFormatter(I18n.locale, {
    day: 'numeric',
    month: 'short',
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

function getSecondaryAmount(tx: CardTransaction): string {
  const original = tx.originalAmount;
  if (
    !original ||
    original.currency.toUpperCase() === tx.billingAmount.currency.toUpperCase()
  ) {
    return '';
  }
  return formatCardAmount(original, tx.isDebit);
}

export function cardTransactionDisplayInfo(
  tx: CardTransaction,
): MoneyTransactionDisplayInfo {
  return {
    label: getTransactionLabel(tx),
    description: getTransactionDescription(tx),
    primaryAmount: formatCardAmount(tx.billingAmount, tx.isDebit),
    fiatAmount: getSecondaryAmount(tx),
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
      return 'Reversed';
    case CardTransactionStatus.Completed:
    default:
      return 'Completed';
  }
}
