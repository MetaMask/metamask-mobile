import { selectIsSocialV1Enabled } from './index';
import { SOCIAL_V1_AB_KEY, SocialV1Variant } from '../../../constants/socialV1';

describe('selectIsSocialV1Enabled', () => {
  it('is true when the leaderboard flag is on and the A/B test is treatment', () => {
    expect(
      selectIsSocialV1Enabled.resultFunc(true, {
        [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment,
      }, undefined),
    ).toBe(true);
  });

  it('is false when the A/B test is control', () => {
    expect(
      selectIsSocialV1Enabled.resultFunc(true, {
        [SOCIAL_V1_AB_KEY]: SocialV1Variant.Control,
      }, undefined),
    ).toBe(false);
  });

  it('is false when the social leaderboard flag is off, even under treatment', () => {
    expect(
      selectIsSocialV1Enabled.resultFunc(false, {
        [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment,
      }, undefined),
    ).toBe(false);
  });

  it('is false when the flag is undefined or an invalid shape', () => {
    expect(selectIsSocialV1Enabled.resultFunc(true, {}, undefined)).toBe(false);
    expect(
      selectIsSocialV1Enabled.resultFunc(true, {
        [SOCIAL_V1_AB_KEY]: 42,
      }, undefined),
    ).toBe(false);
  });
});
