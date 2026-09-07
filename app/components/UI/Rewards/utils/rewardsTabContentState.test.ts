import { getRewardsTabContentState } from './rewardsTabContentState';

describe('getRewardsTabContentState', () => {
  it('treats version-blocked clients as ready with update_required', () => {
    expect(
      getRewardsTabContentState({
        isVersionBlocked: true,
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      }),
    ).toEqual({ contentReady: true, variant: 'update_required' });
  });

  it('treats enrolled users as ready with dashboard', () => {
    expect(
      getRewardsTabContentState({
        isVersionBlocked: false,
        subscriptionId: 'sub-1',
        candidateSubscriptionId: 'pending',
      }),
    ).toEqual({ contentReady: true, variant: 'dashboard' });
  });

  it('waits while candidate subscription is pending', () => {
    expect(
      getRewardsTabContentState({
        isVersionBlocked: false,
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      }),
    ).toEqual({ contentReady: false, variant: 'onboarding' });
  });

  it('waits while candidate subscription is retrying', () => {
    expect(
      getRewardsTabContentState({
        isVersionBlocked: false,
        subscriptionId: null,
        candidateSubscriptionId: 'retry',
      }),
    ).toEqual({ contentReady: false, variant: 'onboarding' });
  });

  it('treats resolved candidate error as onboarding content ready', () => {
    expect(
      getRewardsTabContentState({
        isVersionBlocked: false,
        subscriptionId: null,
        candidateSubscriptionId: 'error',
      }),
    ).toEqual({ contentReady: true, variant: 'onboarding' });
  });

  it('treats null candidate (post-resolve clear) as onboarding content ready', () => {
    expect(
      getRewardsTabContentState({
        isVersionBlocked: false,
        subscriptionId: null,
        candidateSubscriptionId: null,
      }),
    ).toEqual({ contentReady: true, variant: 'onboarding' });
  });
});
