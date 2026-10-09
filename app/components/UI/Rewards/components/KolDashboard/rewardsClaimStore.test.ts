import {
  claimAllRewards,
  getClaimableRewards,
  getIsClaimOnHold,
  getIsClaimsPaused,
  getIsTaxFormPending,
  markClaimOnHold,
  markClaimsPaused,
  markTaxFormPending,
  resetClaimableRewards,
  resetClaimOnHold,
  resetClaimsPaused,
  resetTaxFormPending,
} from './rewardsClaimStore';
import { KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

describe('rewardsClaimStore', () => {
  afterEach(() => {
    resetClaimableRewards();
    resetTaxFormPending();
    resetClaimOnHold();
    resetClaimsPaused();
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

  it('starts with claims not on hold', () => {
    expect(getIsClaimOnHold()).toBe(false);
  });

  it('reports claims on hold after the preview flag is set', () => {
    markClaimOnHold();

    expect(getIsClaimOnHold()).toBe(true);
  });

  it('clears the on-hold flag after a reset', () => {
    markClaimOnHold();

    resetClaimOnHold();

    expect(getIsClaimOnHold()).toBe(false);
  });

  it('starts with claims not paused', () => {
    expect(getIsClaimsPaused()).toBe(false);
  });

  it('reports claims paused after the preview flag is set', () => {
    markClaimsPaused();

    expect(getIsClaimsPaused()).toBe(true);
  });

  it('clears the paused flag after a reset', () => {
    markClaimsPaused();

    resetClaimsPaused();

    expect(getIsClaimsPaused()).toBe(false);
  });
});
