import {
  BannerAlertSeverity,
  IconColor,
} from '@metamask/design-system-react-native';
import {
  INVOICE_PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import { ACTIVE_SUBSCRIPTION_STATUSES } from '../../../../../selectors/subscriptionController';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export const MembershipStatusKind = {
  Active: 'active',
  Overdue: 'overdue',
  Deactivated: 'deactivated',
  Cancelled: 'cancelled',
} as const;

export type MembershipStatusKind =
  (typeof MembershipStatusKind)[keyof typeof MembershipStatusKind];

export const MembershipAlertAction = {
  AddFunds: 'addFunds',
  Renew: 'renew',
} as const;

export type MembershipAlertAction =
  (typeof MembershipAlertAction)[keyof typeof MembershipAlertAction];

export interface MembershipAlert {
  severity: BannerAlertSeverity;
  titleKey: string;
  descriptionKey: string;
  descriptionValues?: Record<string, string>;
  actionKey: string;
  action: MembershipAlertAction;
}

export interface MembershipBannerModel {
  statusKind: MembershipStatusKind;
  statusKey: string;
  /** Present with the alert. Active has neither, so the icon is hidden. */
  iconColor?: IconColor;
  /** Present for Overdue, Deactivated, and Cancelled. Active has no alert. */
  alert?: MembershipAlert;
}

/** Formats a membership date as `MM/DD/YYYY`. */
export const formatMembershipDueDate = (value: string): string => {
  const isoMatch = ISO_DATE.exec(value);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${month}/${day}/${parsed.getFullYear()}`;
};

const ACTIVE_MODEL: MembershipBannerModel = {
  statusKind: MembershipStatusKind.Active,
  statusKey: 'pro_hub.membership_status.active',
};

const overdueAlert = (): MembershipAlert => ({
  severity: BannerAlertSeverity.Danger,
  titleKey: 'pro_hub.membership_alert.payment_failed.title',
  descriptionKey: 'pro_hub.membership_alert.payment_failed.description',
  actionKey: 'pro_hub.membership_alert.payment_failed.action',
  action: MembershipAlertAction.AddFunds,
});

const deactivatedAlert = (): MembershipAlert => ({
  severity: BannerAlertSeverity.Danger,
  titleKey: 'pro_hub.membership_alert.inactive.title',
  descriptionKey: 'pro_hub.membership_alert.inactive.description',
  actionKey: 'pro_hub.membership_alert.inactive.action',
  action: MembershipAlertAction.AddFunds,
});

const cancelledAlert = (date: string | undefined): MembershipAlert => {
  const formattedDate = date ? formatMembershipDueDate(date) : undefined;

  return {
    severity: BannerAlertSeverity.Warning,
    titleKey: 'pro_hub.membership_alert.cancelled.title',
    descriptionKey: formattedDate
      ? 'pro_hub.membership_alert.cancelled.description'
      : 'pro_hub.membership_alert.cancelled.title',
    descriptionValues: formattedDate ? { date: formattedDate } : undefined,
    actionKey: 'pro_hub.membership_alert.cancelled.action',
    action: MembershipAlertAction.Renew,
  };
};

const addFundsAlert = (date: string | undefined): MembershipAlert => {
  const formattedDate = date ? formatMembershipDueDate(date) : undefined;

  return {
    severity: BannerAlertSeverity.Info,
    titleKey: formattedDate
      ? 'pro_hub.membership_alert.low_balance.title'
      : 'pro_hub.membership_alert.low_balance.description',
    descriptionKey: 'pro_hub.membership_alert.low_balance.description',
    descriptionValues: formattedDate ? { date: formattedDate } : undefined,
    actionKey: 'pro_hub.membership_alert.low_balance.action',
    action: MembershipAlertAction.AddFunds,
  };
};

const renewalFailedAlert = (): MembershipAlert => ({
  severity: BannerAlertSeverity.Warning,
  titleKey: 'pro_hub.membership_alert.renewal_failed.title',
  descriptionKey: 'pro_hub.membership_alert.renewal_failed.description',
  actionKey: 'pro_hub.membership_alert.renewal_failed.action',
  action: MembershipAlertAction.AddFunds,
});

const activeModel = (subscription: Subscription): MembershipBannerModel => {
  if (subscription.status === SUBSCRIPTION_STATUSES.awaitingFunds) {
    return {
      ...ACTIVE_MODEL,
      iconColor: IconColor.PrimaryDefault,
      alert: addFundsAlert(
        subscription.currentPeriodEnd || subscription.endDate,
      ),
    };
  }

  if (
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
    subscription.lastInvoice?.status === INVOICE_PAYMENT_STATUSES.FAILED
  ) {
    return {
      ...ACTIVE_MODEL,
      iconColor: IconColor.WarningDefault,
      alert: renewalFailedAlert(),
    };
  }

  return ACTIVE_MODEL;
};

/**
 * Maps a Money Account Plus subscription onto the four Pro Hub status labels.
 *
 * `active`, `trialing`, `provisional`, and `awaiting_funds` show Active. A
 * plan waiting for funds, or an active plan whose latest invoice failed, also
 * shows the existing add-funds or renewal-failed alert. `past_due` shows
 * Overdue. `paused` and `unpaid` show Deactivated. `canceled` shows Cancelled.
 *
 * @param subscription - The displayed Plus subscription. Current wins over the last one.
 * @returns The status label, icon color, and alert for that status.
 */
export const getMembershipBannerModel = (
  subscription?: Subscription,
): MembershipBannerModel => {
  if (!subscription) {
    return ACTIVE_MODEL;
  }

  if (subscription.status === SUBSCRIPTION_STATUSES.canceled) {
    return {
      statusKind: MembershipStatusKind.Cancelled,
      statusKey: 'pro_hub.membership_status.cancelled',
      iconColor: IconColor.WarningDefault,
      alert: cancelledAlert(
        subscription.currentPeriodEnd || subscription.canceledAt,
      ),
    };
  }

  if (subscription.status === SUBSCRIPTION_STATUSES.pastDue) {
    return {
      statusKind: MembershipStatusKind.Overdue,
      statusKey: 'pro_hub.membership_status.overdue',
      iconColor: IconColor.ErrorDefault,
      alert: overdueAlert(),
    };
  }

  if (
    subscription.status === SUBSCRIPTION_STATUSES.paused ||
    subscription.status === SUBSCRIPTION_STATUSES.unpaid
  ) {
    return {
      statusKind: MembershipStatusKind.Deactivated,
      statusKey: 'pro_hub.membership_status.deactivated',
      iconColor: IconColor.ErrorDefault,
      alert: deactivatedAlert(),
    };
  }

  return activeModel(subscription);
};
