import { SUBSCRIPTION_STATUSES } from '@metamask/subscription-controller';
import Routes from '../../../../constants/navigation/Routes';
import {
  PROVISIONAL_POLL_INTERVAL_MS,
  PROVISIONAL_POLL_SLOW_INTERVAL_MS,
  ProvisionalPaymentTransition,
  StartProSubscriptionOutcome,
  getProvisionalSubscriptionPollIntervalMs,
  isStillFundingSubscriptionStatus,
  resolveProSubscriptionStartOutcome,
  resolveProvisionalPaymentTransition,
  shouldShowActiveMembershipCta,
} from './proSubscriptionPaymentStatus';

describe('resolveProSubscriptionStartOutcome', () => {
  it('keeps a funded crypto checkout on the success path', () => {
    const outcome = resolveProSubscriptionStartOutcome(
      true,
      SUBSCRIPTION_STATUSES.provisional,
    );

    expect(outcome).toBe(StartProSubscriptionOutcome.Ready);
  });

  it('keeps an activated crypto checkout on the success path', () => {
    const outcome = resolveProSubscriptionStartOutcome(
      true,
      SUBSCRIPTION_STATUSES.active,
    );

    expect(outcome).toBe(StartProSubscriptionOutcome.Ready);
  });

  it('returns processing when a top-up is still provisional', () => {
    const outcome = resolveProSubscriptionStartOutcome(
      false,
      SUBSCRIPTION_STATUSES.provisional,
    );

    expect(outcome).toBe(StartProSubscriptionOutcome.Processing);
  });

  it('returns processing when a top-up is still awaiting funds', () => {
    const outcome = resolveProSubscriptionStartOutcome(
      false,
      SUBSCRIPTION_STATUSES.awaitingFunds,
    );

    expect(outcome).toBe(StartProSubscriptionOutcome.Processing);
  });

  it('returns ready when a top-up has already activated', () => {
    const outcome = resolveProSubscriptionStartOutcome(
      false,
      SUBSCRIPTION_STATUSES.trialing,
    );

    expect(outcome).toBe(StartProSubscriptionOutcome.Ready);
  });
});

describe('isStillFundingSubscriptionStatus', () => {
  it.each([
    SUBSCRIPTION_STATUSES.provisional,
    SUBSCRIPTION_STATUSES.awaitingFunds,
  ])('returns true for a %s plan', (status) => {
    expect(isStillFundingSubscriptionStatus(status)).toBe(true);
  });

  it('returns false once the plan has activated', () => {
    expect(isStillFundingSubscriptionStatus(SUBSCRIPTION_STATUSES.active)).toBe(
      false,
    );
  });

  it('returns false when the plan is missing', () => {
    expect(isStillFundingSubscriptionStatus(undefined)).toBe(false);
  });
});

describe('resolveProvisionalPaymentTransition', () => {
  it.each([SUBSCRIPTION_STATUSES.active, SUBSCRIPTION_STATUSES.trialing])(
    'returns activated for a %s plan',
    (status) => {
      expect(resolveProvisionalPaymentTransition(status)).toBe(
        ProvisionalPaymentTransition.Activated,
      );
    },
  );

  it.each([
    SUBSCRIPTION_STATUSES.provisional,
    SUBSCRIPTION_STATUSES.awaitingFunds,
  ])('returns pending for a %s plan', (status) => {
    expect(resolveProvisionalPaymentTransition(status)).toBe(
      ProvisionalPaymentTransition.Pending,
    );
  });

  it.each([
    SUBSCRIPTION_STATUSES.canceled,
    SUBSCRIPTION_STATUSES.incomplete,
    SUBSCRIPTION_STATUSES.incompleteExpired,
    SUBSCRIPTION_STATUSES.pastDue,
    SUBSCRIPTION_STATUSES.paused,
    SUBSCRIPTION_STATUSES.unpaid,
  ])('returns failed for a %s plan', (status) => {
    expect(resolveProvisionalPaymentTransition(status)).toBe(
      ProvisionalPaymentTransition.Failed,
    );
  });

  it('returns failed when the provisional plan is gone', () => {
    expect(resolveProvisionalPaymentTransition(undefined)).toBe(
      ProvisionalPaymentTransition.Failed,
    );
  });
});

describe('getProvisionalSubscriptionPollIntervalMs', () => {
  it('skips the extra poll when there is no usable network', () => {
    expect(getProvisionalSubscriptionPollIntervalMs('HIGH', 'NONE')).toBe(
      false,
    );
    expect(getProvisionalSubscriptionPollIntervalMs('LOW', 'NONE')).toBe(false);
    expect(getProvisionalSubscriptionPollIntervalMs(null, 'NONE')).toBe(false);
  });

  it('polls once a minute on a slow cellular link', () => {
    expect(
      getProvisionalSubscriptionPollIntervalMs('HIGH', 'SLOW_CELLULAR'),
    ).toBe(PROVISIONAL_POLL_SLOW_INTERVAL_MS);
  });

  it('uses the product interval when the network tier is unknown', () => {
    expect(getProvisionalSubscriptionPollIntervalMs('LOW', null)).toBe(
      PROVISIONAL_POLL_INTERVAL_MS,
    );
    expect(getProvisionalSubscriptionPollIntervalMs(null, null)).toBe(
      PROVISIONAL_POLL_INTERVAL_MS,
    );
  });

  it('polls once a minute on a low-memory device with a known fast network', () => {
    expect(getProvisionalSubscriptionPollIntervalMs('LOW', 'WIFI')).toBe(
      PROVISIONAL_POLL_SLOW_INTERVAL_MS,
    );
  });

  it('uses the product interval on a mid or high device with a fast network', () => {
    expect(getProvisionalSubscriptionPollIntervalMs('MID', 'WIFI')).toBe(
      PROVISIONAL_POLL_INTERVAL_MS,
    );
    expect(
      getProvisionalSubscriptionPollIntervalMs('HIGH', 'FAST_CELLULAR'),
    ).toBe(PROVISIONAL_POLL_INTERVAL_MS);
    expect(getProvisionalSubscriptionPollIntervalMs(null, 'WIFI')).toBe(
      PROVISIONAL_POLL_INTERVAL_MS,
    );
  });
});

describe('shouldShowActiveMembershipCta', () => {
  it('hides the action on Pro Hub screens', () => {
    expect(shouldShowActiveMembershipCta(Routes.PRO_HUB.ROOT)).toBe(false);
    expect(shouldShowActiveMembershipCta(Routes.PRO_HUB.MEMBERSHIP)).toBe(
      false,
    );
    expect(shouldShowActiveMembershipCta(Routes.PRO_HUB.EARNED)).toBe(false);
    expect(
      shouldShowActiveMembershipCta(Routes.PRO_HUB.CANCEL_MEMBERSHIP),
    ).toBe(false);
  });

  it('shows the action on every other screen', () => {
    expect(shouldShowActiveMembershipCta(Routes.WALLET.HOME)).toBe(true);
    expect(shouldShowActiveMembershipCta(undefined)).toBe(true);
  });
});
