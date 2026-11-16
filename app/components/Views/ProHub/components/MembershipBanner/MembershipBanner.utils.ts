import {
  BannerAlertSeverity,
  IconColor,
} from '@metamask/design-system-react-native';
import {
  INVOICE_PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  isMoneyAccountPlusFreeTrial,
} from '../../../../../selectors/subscriptionController';
import { formatSubscriptionPeriodEnd } from '../../ProHub.utils';

export const MembershipStatusKind = {
  Active: 'active',
  FreeTrial: 'freeTrial',
  Overdue: 'overdue',
  Deactivated: 'deactivated',
  Cancelled: 'cancelled',
  Unavailable: 'unavailable',
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
  /** Omitted when there is no second line, so the title is not repeated. */
  descriptionKey?: string;
  /** Shared by the title and description. Either string may use `{{date}}`. */
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

const ACTIVE_MODEL: MembershipBannerModel = {
  statusKind: MembershipStatusKind.Active,
  statusKey: 'pro_hub.membership_status.active',
};

const FREE_TRIAL_MODEL: MembershipBannerModel = {
  statusKind: MembershipStatusKind.FreeTrial,
  statusKey: 'pro_hub.membership_status.free_trial',
};

const UNAVAILABLE_MODEL: MembershipBannerModel = {
  statusKind: MembershipStatusKind.Unavailable,
  statusKey: 'pro_hub.membership_status.unavailable',
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
  const formattedDate = formatSubscriptionPeriodEnd(date);

  return {
    severity: BannerAlertSeverity.Warning,
    titleKey: 'pro_hub.membership_alert.cancelled.title',
    descriptionKey: formattedDate
      ? 'pro_hub.membership_alert.cancelled.description'
      : undefined,
    descriptionValues: formattedDate ? { date: formattedDate } : undefined,
    actionKey: 'pro_hub.membership_alert.cancelled.action',
    action: MembershipAlertAction.Renew,
  };
};

const addFundsAlert = (date: string | undefined): MembershipAlert => {
  const formattedDate = formatSubscriptionPeriodEnd(date);

  return {
    severity: BannerAlertSeverity.Info,
    titleKey: formattedDate
      ? 'pro_hub.membership_alert.low_balance.title'
      : 'pro_hub.membership_alert.low_balance.description',
    descriptionKey: formattedDate
      ? 'pro_hub.membership_alert.low_balance.description'
      : undefined,
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
 * Maps a Money Account Plus subscription onto the Pro Hub status labels.
 *
 * `trialing` shows Free trial. A `provisional` plan shows Free trial only
 * while `trialPeriodDays` is greater than zero, because a free trial stays
 * provisional until CHOMP moves it to `trialing`. A provisional plan with no
 * trial shows Active, as do `active` and `awaiting_funds`. A plan waiting
 * for funds, or an active plan whose latest invoice failed, also shows the
 * existing add-funds or renewal-failed alert. `past_due` shows Overdue.
 * `paused` and `unpaid` show Deactivated. `canceled` shows Cancelled.
 * A missing plan, or a status this screen does not map, shows Unavailable.
 *
 * @param subscription - The displayed Plus subscription. Current wins over the last one.
 * @returns The status label, icon color, and alert for that status.
 */
export const getMembershipBannerModel = (
  subscription?: Subscription,
): MembershipBannerModel => {
  if (!subscription) {
    return UNAVAILABLE_MODEL;
  }

  if (isMoneyAccountPlusFreeTrial(subscription)) {
    return FREE_TRIAL_MODEL;
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

  if (
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) ||
    subscription.status === SUBSCRIPTION_STATUSES.awaitingFunds
  ) {
    return activeModel(subscription);
  }

  return UNAVAILABLE_MODEL;
};
