import {
  selectHasSocialV1Access,
  selectIsSocialV1Enabled,
  selectIsSocialV1Treatment,
} from './index';
import { SOCIAL_V1_AB_KEY, SocialV1Variant } from '../../../constants/socialV1';

describe('selectIsSocialV1Treatment', () => {
  it('is true when the A/B test is treatment', () => {
    expect(
      selectIsSocialV1Treatment.resultFunc(
        { [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment },
        {},
      ),
    ).toBe(true);
  });

  it('is false when the A/B test is control', () => {
    expect(
      selectIsSocialV1Treatment.resultFunc(
        { [SOCIAL_V1_AB_KEY]: SocialV1Variant.Control },
        {},
      ),
    ).toBe(false);
  });

  it('is false when the flag is undefined or an invalid shape', () => {
    expect(selectIsSocialV1Treatment.resultFunc({}, {})).toBe(false);
    expect(
      selectIsSocialV1Treatment.resultFunc({ [SOCIAL_V1_AB_KEY]: 42 }, {}),
    ).toBe(false);
  });
});

describe('selectHasSocialV1Access', () => {
  it.each([
    [true, false, true],
    [false, true, true],
    [true, true, true],
    [false, false, false],
  ])(
    'with treatment %s and early access %s, returns %s',
    (isTreatment, hasEarlyAccess, expected) => {
      expect(
        selectHasSocialV1Access.resultFunc(isTreatment, hasEarlyAccess),
      ).toBe(expected);
    },
  );
});

describe('selectIsSocialV1Enabled', () => {
  it.each([
    [true, true, false, true],
    [true, false, false, false],
    [false, true, false, false],
    [false, false, true, true],
    [true, false, true, true],
    [false, false, false, false],
  ])(
    'with leaderboard %s, treatment %s and early access %s, returns %s',
    (isSocialLeaderboardEnabled, isTreatment, hasEarlyAccess, expected) => {
      expect(
        selectIsSocialV1Enabled.resultFunc(
          isSocialLeaderboardEnabled,
          isTreatment,
          hasEarlyAccess,
        ),
      ).toBe(expected);
    },
  );
});
