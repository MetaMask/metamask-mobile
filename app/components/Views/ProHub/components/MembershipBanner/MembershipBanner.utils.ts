import {
  BannerAlertSeverity,
  IconColor,
} from '@metamask/design-system-react-native';
import {
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionStatus,
} from '@metamask/subscription-controller';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Statuses that show "Active". A trial stays Active; the label does not change.
 */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUSES.active,
  SUBSCRIPTION_STATUSES.trialing,
  SUBSCRIPTION_STATUSES.provisional,
]);

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

export interface MembershipBannerInput {
  /** Subscription still in the controller's current list, any status. */
  current?: Subscription;
  /** Current subscription, or the last one when the current list has none. */
  displayed?: Subscription;
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

const cancelledAlert = (date: string | undefined): MembershipAlert => ({
  severity: BannerAlertSeverity.Warning,
  titleKey: 'pro_hub.membership_alert.cancelled.title',
  descriptionKey: 'pro_hub.membership_alert.cancelled.description',
  descriptionValues: date ? { date: formatMembershipDueDate(date) } : undefined,
  actionKey: 'pro_hub.membership_alert.cancelled.action',
  action: MembershipAlertAction.Renew,
});

/**
 * Maps a Money Account Plus subscription onto the four Pro Hub status labels.
 *
 * `active`, `trialing`, and `provisional` show Active, including a trial and
 * a plan that is scheduled to cancel. `past_due` shows Overdue. `paused` and
 * `unpaid` show Deactivated. `canceled` shows Cancelled. The label and alert
 * copy stay the existing Pro Hub strings.
 *
 * @param input - Current and displayed subscriptions.
 * @returns The status label, icon color, and alert for that status.
 */
export const getMembershipBannerModel = ({
  current,
  displayed,
}: MembershipBannerInput): MembershipBannerModel => {
  const subscription = current ?? displayed;
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

  if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return ACTIVE_MODEL;
  }

  return ACTIVE_MODEL;
};
