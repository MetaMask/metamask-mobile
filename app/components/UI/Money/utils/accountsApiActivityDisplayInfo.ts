import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { AccountsApiActivity } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatUsd } from './moneyFormatFiat';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../Card/util/vedaToken';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { formatCardAmount } from '../../Card/utils/cardTransactionAmount';
import { isUnsuccessfulCardTransactionStatus } from '../../Card/utils/cardTransactionDisplayInfo';

const KIND_LABEL_KEY: Record<AccountsApiActivity['kind'], string> = {
  card: 'money.transaction.purchase',
  cashback: 'money.transaction.musd_back',
  refund: 'money.transaction.refund',
  bank_transfer: 'money.transaction.deposited',
};

export function accountsApiActivityDisplayInfo(
  activity: AccountsApiActivity,
  enrichment?: CardTransaction,
): MoneyTransactionDisplayInfo {
  const isIncoming =
    activity.kind === 'cashback' ||
    activity.kind === 'refund' ||
    activity.kind === 'bank_transfer';
  const sign = isIncoming ? '+' : '-';

  // Card activity amounts are already denominated in USD (mUSD is USD-pegged).
  const usdValue = new BigNumber(activity.amount).dividedBy(
    new BigNumber(10).pow(activity.token.decimals),
  );

  const primaryAmount = `${sign}${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`;
  const fiatAmount = `${sign}${moneyFormatUsd(usdValue)}`;

  const base: MoneyTransactionDisplayInfo = {
    description:
      activity.kind === 'bank_transfer'
        ? strings('money.transaction.bank_transfer')
        : strings('money.transaction.card'),
    label: strings(KIND_LABEL_KEY[activity.kind]),
    primaryAmount,
    fiatAmount,
    isIncoming,
    icon: activity.kind === 'bank_transfer' ? IconName.Add : IconName.Card,
    status: 'confirmed',
    showPrimaryAmount: activity.kind === 'bank_transfer',
    isFiatAmountMuted: activity.kind === 'bank_transfer',
  };

  if (activity.kind !== 'card' || !enrichment) {
    return base;
  }

  // originalAmount is already the merchant-currency amount from the Card
  // provider. formatCardAmount only formats it; USD stays on the mUSD line.
  const original = enrichment.originalAmount;
  const secondaryAmount =
    original && original.currency.toUpperCase() !== 'USD'
      ? formatCardAmount(original, enrichment.isDebit)
      : fiatAmount;

  return {
    ...base,
    description: enrichment.merchant?.name ?? base.description,
    fiatAmount: secondaryAmount,
    // A declined or reversed purchase can still settle on-chain, so the
    // Accounts-API row is indistinguishable from a successful spend — the
    // data service only sees the transfer. The card provider holds the real
    // outcome, so let the enrichment override the status.
    status: isUnsuccessfulCardTransactionStatus(enrichment.status)
      ? 'failed'
      : base.status,
  };
}
