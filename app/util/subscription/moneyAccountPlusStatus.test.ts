import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '@metamask/subscription-controller';
import {
  MembershipBenefitsMode,
  getMembershipBenefitsMode,
  isActiveSubscriptionStatus,
  isConfirmedSubscriptionStatus,
  isDeactivatedSubscriptionStatus,
  isFundingSubscriptionStatus,
  isHubMembershipSubscriptionStatus,
  isManageableSubscriptionStatus,
} from './moneyAccountPlusStatus';

const ALL_STATUSES = Object.values(SUBSCRIPTION_STATUSES);

const expectOnly = (
  predicate: (status: SubscriptionStatus | undefined) => boolean,
  expected: SubscriptionStatus[],
) => {
  const matched = ALL_STATUSES.filter((status) => predicate(status));

  expect(matched.sort()).toEqual([...expected].sort());
  expect(predicate(undefined)).toBe(false);
};

describe('moneyAccountPlusStatus', () => {
  it('treats active, trialing, and provisional as benefit-granting', () => {
    expectOnly(isActiveSubscriptionStatus, [
      SUBSCRIPTION_STATUSES.active,
      SUBSCRIPTION_STATUSES.trialing,
      SUBSCRIPTION_STATUSES.provisional,
    ]);
  });

  it('treats active and trialing as confirmed', () => {
    expectOnly(isConfirmedSubscriptionStatus, [
      SUBSCRIPTION_STATUSES.active,
      SUBSCRIPTION_STATUSES.trialing,
    ]);
  });

  it('treats provisional and awaiting funds as funding', () => {
    expectOnly(isFundingSubscriptionStatus, [
      SUBSCRIPTION_STATUSES.provisional,
      SUBSCRIPTION_STATUSES.awaitingFunds,
    ]);
  });

  it('treats paused and unpaid as deactivated', () => {
    expectOnly(isDeactivatedSubscriptionStatus, [
      SUBSCRIPTION_STATUSES.paused,
      SUBSCRIPTION_STATUSES.unpaid,
    ]);
  });

  it('adds paused to the benefit-granting set for a manageable plan', () => {
    expectOnly(isManageableSubscriptionStatus, [
      SUBSCRIPTION_STATUSES.active,
      SUBSCRIPTION_STATUSES.trialing,
      SUBSCRIPTION_STATUSES.provisional,
      SUBSCRIPTION_STATUSES.paused,
    ]);
  });

  it('opens Pro Hub for every status the membership banner can show', () => {
    expectOnly(isHubMembershipSubscriptionStatus, [
      SUBSCRIPTION_STATUSES.active,
      SUBSCRIPTION_STATUSES.trialing,
      SUBSCRIPTION_STATUSES.provisional,
      SUBSCRIPTION_STATUSES.awaitingFunds,
      SUBSCRIPTION_STATUSES.pastDue,
      SUBSCRIPTION_STATUSES.paused,
      SUBSCRIPTION_STATUSES.unpaid,
    ]);
  });

  describe('getMembershipBenefitsMode', () => {
    it.each([
      [SUBSCRIPTION_STATUSES.active, MembershipBenefitsMode.Granted],
      [SUBSCRIPTION_STATUSES.trialing, MembershipBenefitsMode.Granted],
      [SUBSCRIPTION_STATUSES.provisional, MembershipBenefitsMode.Granted],
      [SUBSCRIPTION_STATUSES.paused, MembershipBenefitsMode.Paused],
      [SUBSCRIPTION_STATUSES.unpaid, MembershipBenefitsMode.Paused],
      [SUBSCRIPTION_STATUSES.pastDue, MembershipBenefitsMode.None],
      [SUBSCRIPTION_STATUSES.awaitingFunds, MembershipBenefitsMode.None],
      [SUBSCRIPTION_STATUSES.canceled, MembershipBenefitsMode.None],
      [undefined, MembershipBenefitsMode.None],
    ] as const)('maps %s to %s', (status, mode) => {
      expect(getMembershipBenefitsMode(status)).toBe(mode);
    });
  });
});
