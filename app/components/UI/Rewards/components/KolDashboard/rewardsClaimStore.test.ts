import {
  claimAllRewards,
  getClaimableRewards,
  getIsTaxFormPending,
  markTaxFormPending,
  resetClaimableRewards,
  resetTaxFormPending,
} from './rewardsClaimStore';
import { KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

describe('rewardsClaimStore', () => {
  afterEach(() => {
    resetClaimableRewards();
    resetTaxFormPending();
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

  it('starts with no tax form under review', () => {
    expect(getIsTaxFormPending()).toBe(false);
  });

  it('reports a pending tax form after the user leaves for the partner site', () => {
    markTaxFormPending();

    expect(getIsTaxFormPending()).toBe(true);
  });

  it('clears the pending tax form after a reset', () => {
    markTaxFormPending();

    resetTaxFormPending();

    expect(getIsTaxFormPending()).toBe(false);
  });
});
