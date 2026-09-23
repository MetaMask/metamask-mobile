import {
  claimAllRewards,
  getClaimableRewards,
  resetClaimableRewards,
} from './rewardsClaimStore';
import { KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

describe('rewardsClaimStore', () => {
  afterEach(() => {
    resetClaimableRewards();
  });

  it('starts at the fixture balance', () => {
    expect(getClaimableRewards()).toBe(KOL_EARNINGS_FIXTURE.availableToClaim);
  });

  it('returns zero after claiming', () => {
    claimAllRewards();

    expect(getClaimableRewards()).toBe(0);
  });

  it('returns the fixture balance again after a reset', () => {
    claimAllRewards();

    resetClaimableRewards();

    expect(getClaimableRewards()).toBe(KOL_EARNINGS_FIXTURE.availableToClaim);
  });
});
