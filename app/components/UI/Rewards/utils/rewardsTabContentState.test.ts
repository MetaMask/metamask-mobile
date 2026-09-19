import type { ReferralVariant } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  getRewardsTabContentState,
  type CandidateSubscriptionId,
} from './rewardsTabContentState';

const buildInput = ({
  isVersionBlocked = false,
  subscriptionId = null as string | null,
  candidateSubscriptionId = 'pending' as CandidateSubscriptionId,
  moneyEnabled = false,
  moneyReferralResolved = false,
  moneyVariant = undefined as ReferralVariant | undefined,
} = {}) => ({
  isVersionBlocked,
  subscriptionId,
  candidateSubscriptionId,
  moneyEnabled,
  moneyReferralResolved,
  moneyVariant,
});

describe('getRewardsTabContentState', () => {
  it('treats version-blocked clients as ready with update_required', () => {
    const result = getRewardsTabContentState(
      buildInput({
        isVersionBlocked: true,
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      }),
    );

    expect(result).toEqual({
      status: 'ready',
      variant: 'update_required',
    });
  });

  it('treats enrolled users as ready with dashboard', () => {
    const result = getRewardsTabContentState(
      buildInput({
        subscriptionId: 'sub-1',
        candidateSubscriptionId: 'pending',
      }),
    );

    expect(result).toEqual({ status: 'ready', variant: 'dashboard' });
  });

  it('waits on candidate subscription while pending', () => {
    const result = getRewardsTabContentState(
      buildInput({
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      }),
    );

    expect(result).toEqual({
      status: 'pending',
      reason: 'candidate_subscription',
    });
  });

  it('waits on candidate subscription while retrying', () => {
    const result = getRewardsTabContentState(
      buildInput({
        subscriptionId: null,
        candidateSubscriptionId: 'retry',
      }),
    );

    expect(result).toEqual({
      status: 'pending',
      reason: 'candidate_subscription',
    });
  });

  it('treats resolved candidate error as onboarding content ready', () => {
    const result = getRewardsTabContentState(
      buildInput({
        subscriptionId: null,
        candidateSubscriptionId: 'error',
      }),
    );

    expect(result).toEqual({ status: 'ready', variant: 'onboarding' });
  });

  it('treats null candidate (post-resolve clear) as onboarding content ready', () => {
    const result = getRewardsTabContentState(
      buildInput({
        subscriptionId: null,
        candidateSubscriptionId: null,
      }),
    );

    expect(result).toEqual({ status: 'ready', variant: 'onboarding' });
  });

  describe('rewards money referral', () => {
    it('waits while the money referral persona is unresolved', () => {
      const result = getRewardsTabContentState(
        buildInput({
          moneyEnabled: true,
          moneyReferralResolved: false,
          candidateSubscriptionId: 'error',
        }),
      );

      expect(result).toEqual({
        status: 'pending',
        reason: 'money_referral',
      });
    });

    it('waits on the money referral persona even for enrolled users', () => {
      const result = getRewardsTabContentState(
        buildInput({
          subscriptionId: 'sub-1',
          candidateSubscriptionId: null,
          moneyEnabled: true,
          moneyReferralResolved: false,
        }),
      );

      expect(result).toEqual({
        status: 'pending',
        reason: 'money_referral',
      });
    });

    it('lets version-blocked win over an unresolved money referral', () => {
      const result = getRewardsTabContentState(
        buildInput({
          isVersionBlocked: true,
          moneyEnabled: true,
          moneyReferralResolved: false,
        }),
      );

      expect(result).toEqual({
        status: 'ready',
        variant: 'update_required',
      });
    });

    it('lets version-blocked win over a money persona', () => {
      const result = getRewardsTabContentState(
        buildInput({
          isVersionBlocked: true,
          moneyEnabled: true,
          moneyReferralResolved: true,
          moneyVariant: 'REFERRER',
        }),
      );

      expect(result).toEqual({
        status: 'ready',
        variant: 'update_required',
      });
    });

    it.each<ReferralVariant>(['REFERRER', 'REFEREE'])(
      'routes %s to the money dashboard',
      (moneyVariant) => {
        const result = getRewardsTabContentState(
          buildInput({
            subscriptionId: null,
            candidateSubscriptionId: 'pending',
            moneyEnabled: true,
            moneyReferralResolved: true,
            moneyVariant,
          }),
        );

        expect(result).toEqual({
          status: 'ready',
          variant: 'money_dashboard',
        });
      },
    );

    it('routes NONE to the enrolled points dashboard', () => {
      const result = getRewardsTabContentState(
        buildInput({
          subscriptionId: 'sub-1',
          candidateSubscriptionId: null,
          moneyEnabled: true,
          moneyReferralResolved: true,
          moneyVariant: 'NONE',
        }),
      );

      expect(result).toEqual({ status: 'ready', variant: 'dashboard' });
    });

    it('routes NONE without a subscription to onboarding', () => {
      const result = getRewardsTabContentState(
        buildInput({
          subscriptionId: null,
          candidateSubscriptionId: 'error',
          moneyEnabled: true,
          moneyReferralResolved: true,
          moneyVariant: 'NONE',
        }),
      );

      expect(result).toEqual({ status: 'ready', variant: 'onboarding' });
    });

    it('routes a resolved fetch error (no variant) to the points path', () => {
      const result = getRewardsTabContentState(
        buildInput({
          subscriptionId: 'sub-1',
          candidateSubscriptionId: null,
          moneyEnabled: true,
          moneyReferralResolved: true,
          moneyVariant: undefined,
        }),
      );

      expect(result).toEqual({ status: 'ready', variant: 'dashboard' });
    });

    it('never waits on the money referral when money is disabled', () => {
      const result = getRewardsTabContentState(
        buildInput({
          subscriptionId: 'sub-1',
          candidateSubscriptionId: null,
          moneyEnabled: false,
          moneyReferralResolved: false,
        }),
      );

      expect(result).toEqual({ status: 'ready', variant: 'dashboard' });
    });

    it('ignores a stale money persona when money is disabled', () => {
      const result = getRewardsTabContentState(
        buildInput({
          subscriptionId: null,
          candidateSubscriptionId: 'error',
          moneyEnabled: false,
          moneyReferralResolved: true,
          moneyVariant: 'REFERRER',
        }),
      );

      expect(result).toEqual({ status: 'ready', variant: 'onboarding' });
    });
  });
});
