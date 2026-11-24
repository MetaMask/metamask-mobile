import {
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type Currency,
  type Subscription,
} from '@metamask/subscription-controller';
import { strings } from '../../../../../../locales/i18n';
import { formatSubscriptionFiat } from '../../../../../util/subscription/formatSubscriptionFiat';
import {
  formatSubscriptionPeriodEnd,
  isMembershipPeriodEnded,
  isPeriodEndCancellationPending,
} from '../../ProHub.utils';
import { MEMBERSHIP_UNAVAILABLE_VALUE } from './Membership.constants';

/**
 * Locale key for the date row. A period that has already ended says
 * "Ended on", even if it was never cancelled. A cancel that is still
 * scheduled says "Ends on". Otherwise the row says "Renews on".
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @param now - Clock used to compare `currentPeriodEnd`.
 * @returns The translation key for the date row label.
 */
export const getRenewalRowLabelKey = (
  subscription: Subscription | undefined,
  now: Date = new Date(),
): string => {
  if (isMembershipPeriodEnded(subscription, now)) {
    return 'pro_hub.membership.ended_on';
  }
  if (isPeriodEndCancellationPending(subscription, now)) {
    return 'pro_hub.membership.ends_on';
  }
  return 'pro_hub.membership.renews_on';
};

export interface MembershipPricing {
  status: 'ready' | 'unavailable' | 'malformed';
  monthly?: {
    amount: number;
    currency: Currency;
  };
}

export interface MembershipDetails {
  plan: string;
  lifetimeEarnings: string;
  total: string;
  totalOriginal?: string;
  savingsNote?: string;
  payingWith: string;
  renewsOn: string;
}

/**
 * Formats the date shown on the row labelled by `getRenewalRowLabelKey`.
 *
 * "Renews on" names the charge day, which is `currentPeriodEnd` itself.
 * "Ends on" and "Ended on" name the last day of access, one millisecond
 * earlier. Pinned to en-US so the row keeps the designed "Oct 8, 2026" order
 * rather than following the device locale.
 *
 * @param subscription - Money Account Plus subscription.
 * @param now - Clock used to pick the row label.
 * @returns The formatted date, or the unavailable placeholder.
 */
const formatRenewalDate = (subscription: Subscription, now: Date): string => {
  const isEndOfAccessRow =
    isMembershipPeriodEnded(subscription, now) ||
    isPeriodEndCancellationPending(subscription, now);

  return (
    formatSubscriptionPeriodEnd(subscription.currentPeriodEnd, {
      locale: 'en-US',
      exclusivePeriodEnd: isEndOfAccessRow,
    }) ?? MEMBERSHIP_UNAVAILABLE_VALUE
  );
};

const formatPaymentMethod = (
  subscription: Subscription,
): MembershipDetails['payingWith'] => {
  const { paymentMethod } = subscription;
  if (paymentMethod.type === PAYMENT_TYPES.byCard) {
    const brand = paymentMethod.card.displayBrand || paymentMethod.card.brand;
    return `${brand.toUpperCase()} •••• ${paymentMethod.card.last4}`;
  }

  // Crypto subscriptions are always funded from the Money account, so the
  // account is shown rather than the token it is settled in.
  return strings('pro_hub.membership.money_account');
};

const getAnnualSavings = (
  subscription: Subscription,
  plusPricing: MembershipPricing,
  annualAmount: number,
): Pick<MembershipDetails, 'totalOriginal' | 'savingsNote'> => {
  if (
    subscription.interval !== RECURRING_INTERVALS.year ||
    plusPricing.status !== 'ready' ||
    plusPricing.monthly === undefined
  ) {
    return {};
  }

  const originalAmount = plusPricing.monthly.amount * 12;
  const savedAmount = originalAmount - annualAmount;
  if (savedAmount <= 0) {
    return {};
  }

  const freeMonths = Math.round(savedAmount / plusPricing.monthly.amount);
  if (freeMonths <= 0) {
    return {};
  }

  const savingsKey =
    freeMonths === 1
      ? 'pro_hub.membership.months_on_us_one'
      : 'pro_hub.membership.months_on_us_other';

  return {
    totalOriginal: formatSubscriptionFiat(
      originalAmount,
      plusPricing.monthly.currency,
    ),
    savingsNote: strings(savingsKey, { count: freeMonths }),
  };
};

/**
 * Maps SubscriptionController state to values displayed by the Membership
 * screen. Earnings are not part of SubscriptionController state.
 *
 * @param subscription - Active Money Account Plus subscription.
 * @param plusPricing - Current Money Account Plus pricing.
 * @param now - Clock used to pick the date row label.
 * @returns Display-ready membership values.
 */
export const getMembershipDetails = (
  subscription: Subscription | undefined,
  plusPricing: MembershipPricing,
  now: Date = new Date(),
): MembershipDetails => {
  if (subscription === undefined) {
    return {
      plan: MEMBERSHIP_UNAVAILABLE_VALUE,
      lifetimeEarnings: MEMBERSHIP_UNAVAILABLE_VALUE,
      total: MEMBERSHIP_UNAVAILABLE_VALUE,
      payingWith: MEMBERSHIP_UNAVAILABLE_VALUE,
      renewsOn: MEMBERSHIP_UNAVAILABLE_VALUE,
    };
  }

  const plusProduct = subscription.products.find(
    (product) => product.name === PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
  );
  const intervalLabel =
    subscription.interval === RECURRING_INTERVALS.year
      ? strings('pro_subscription.plans.annual.label')
      : strings('pro_subscription.plans.monthly.label');
  const total =
    plusProduct === undefined
      ? MEMBERSHIP_UNAVAILABLE_VALUE
      : formatSubscriptionFiat(
          plusProduct.unitAmount / 10 ** plusProduct.unitDecimals,
          plusProduct.currency,
        );
  const annualSavings =
    plusProduct === undefined
      ? {}
      : getAnnualSavings(
          subscription,
          plusPricing,
          plusProduct.unitAmount / 10 ** plusProduct.unitDecimals,
        );

  return {
    plan: intervalLabel,
    lifetimeEarnings: MEMBERSHIP_UNAVAILABLE_VALUE,
    total,
    payingWith: formatPaymentMethod(subscription),
    renewsOn: formatRenewalDate(subscription, now),
    ...annualSavings,
  };
};
