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

interface ResolvedAccountsApiAmount {
  /** Token line for the details screen, e.g. "-6.57 mUSD" or a placeholder. */
  primaryAmount: string;
  /**
   * Signed dollar line for the activity list, e.g. "-$6.57". Empty while the
   * valuation is pending or unavailable.
   */
  dollarAmount: string;
  isAmountPending: boolean;
}

/**
 * Resolves the token line and the 1:1 dollar line for an Accounts API row.
 * Card and cashback rows prefer a historical or approximate valuation over
 * the raw settlement amount. Refunds and bank transfers ignore that
 * valuation and use the settlement amount.
 */
function resolveAccountsApiAmount(
  activity: AccountsApiActivity,
): ResolvedAccountsApiAmount {
  const isIncoming =
    activity.kind === 'cashback' ||
    activity.kind === 'refund' ||
    activity.kind === 'bank_transfer';
  const sign = isIncoming ? '+' : '-';
  const displayAmount =
    activity.kind === 'card' || activity.kind === 'cashback'
      ? activity.displayAmount
      : undefined;
  const usdValue =
    displayAmount &&
    (displayAmount.type === 'historical' ||
      displayAmount.type === 'approximate')
      ? new BigNumber(displayAmount.value).shiftedBy(-displayAmount.decimals)
      : new BigNumber(activity.amount).shiftedBy(-activity.token.decimals);
  const approximatePrefix = displayAmount?.type === 'approximate' ? '≈' : '';
  const amountUnavailable =
    displayAmount?.type === 'unavailable'
      ? strings('money.api_activity_details.amount_unavailable')
      : undefined;
  const isAmountPending = displayAmount?.type === 'pending';
  const hasDollarAmount = amountUnavailable === undefined && !isAmountPending;

  return {
    primaryAmount: isAmountPending
      ? '—'
      : (amountUnavailable ??
        `${approximatePrefix}${sign}${usdValue.toFixed(2)} ${MONEY_ACCOUNT_DISPLAY_SYMBOL}`),
    dollarAmount: hasDollarAmount
      ? `${approximatePrefix}${sign}${moneyFormatUsd(usdValue.abs())}`
      : '',
    isAmountPending,
  };
}

function withCardEnrichment(
  base: MoneyTransactionDisplayInfo,
  enrichment: CardTransaction,
): MoneyTransactionDisplayInfo {
  // originalAmount is already the merchant-currency amount from the Card
  // provider. formatCardAmount only formats it; USD stays on the mUSD line.
  const original = enrichment.originalAmount;
  const secondaryAmount =
    original && original.currency.toUpperCase() !== 'USD'
      ? formatCardAmount(original, enrichment.isDebit)
      : base.fiatAmount;

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

/**
 * Full presentation for an Accounts API activity, including the mUSD token
 * line. The transaction details screen reads `primaryAmount` and
 * `fiatAmount` from here. The activity list uses
 * {@link accountsApiActivityListDisplayInfo} so the row shows dollars only.
 */
export function accountsApiActivityDisplayInfo(
  activity: AccountsApiActivity,
  enrichment?: CardTransaction,
): MoneyTransactionDisplayInfo {
  const isIncoming =
    activity.kind === 'cashback' ||
    activity.kind === 'refund' ||
    activity.kind === 'bank_transfer';
  const { primaryAmount, dollarAmount, isAmountPending } =
    resolveAccountsApiAmount(activity);
  const displayAmount =
    activity.kind === 'card' || activity.kind === 'cashback'
      ? activity.displayAmount
      : undefined;

  const base: MoneyTransactionDisplayInfo = {
    description:
      activity.kind === 'bank_transfer'
        ? strings('money.transaction.bank_transfer')
        : strings('money.transaction.card'),
    label: strings(KIND_LABEL_KEY[activity.kind]),
    primaryAmount,
    fiatAmount: dollarAmount,
    isIncoming,
    icon: activity.kind === 'bank_transfer' ? IconName.Add : IconName.Card,
    status: 'confirmed',
    showPrimaryAmount:
      activity.kind === 'bank_transfer' || displayAmount !== undefined,
    isPrimaryAmountPending: isAmountPending,
    isFiatAmountMuted:
      activity.kind === 'bank_transfer' ||
      (displayAmount !== undefined && activity.kind === 'card'),
  };

  if (activity.kind !== 'card' || !enrichment) {
    return base;
  }

  return withCardEnrichment(base, enrichment);
}

/**
 * Activity-list presentation for an Accounts API row.
 *
 * The Money activity list is a neobanking ledger: one dollar amount per row,
 * with the same sign and colour as other inflows and outflows. The mUSD token
 * line and any merchant-currency amount stay on
 * {@link accountsApiActivityDisplayInfo} for the details screen. Pending and
 * unavailable valuations have no dollar figure yet, so the placeholder stays.
 */
export function accountsApiActivityListDisplayInfo(
  activity: AccountsApiActivity,
  enrichment?: CardTransaction,
): MoneyTransactionDisplayInfo {
  const details = accountsApiActivityDisplayInfo(activity, enrichment);
  const { dollarAmount } = resolveAccountsApiAmount(activity);

  if (!dollarAmount) {
    return details;
  }

  return {
    ...details,
    fiatAmount: dollarAmount,
    showPrimaryAmount: false,
    isFiatAmountMuted: false,
    isPrimaryAmountPending: false,
  };
}
