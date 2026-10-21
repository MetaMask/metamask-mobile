import { KOL_REWARDS_UI_STATE_MATRIX } from './rewardsUiStateMatrix';

describe('KOL_REWARDS_UI_STATE_MATRIX', () => {
  it('records the populated KOL dashboard as the implemented Ways to earn state', () => {
    expect(KOL_REWARDS_UI_STATE_MATRIX.waysToEarn.implemented).toContain(
      'populatedKol',
    );
  });

  it('keeps campaign eligibility states out of this dashboard dump', () => {
    expect(
      KOL_REWARDS_UI_STATE_MATRIX.campaignEligibility.implemented,
    ).toHaveLength(0);
  });
});
