import { selectExploreEarnSectionEnabledFlag } from './featureFlags';
import { selectIsEarnSectionEligible } from './eligibility';
import { selectIsExploreEarnSectionVisible } from './visibility';

jest.mock('./featureFlags', () => ({
  selectExploreEarnSectionEnabledFlag: jest.fn(),
}));
jest.mock('./eligibility', () => ({
  selectIsEarnSectionEligible: jest.fn(),
}));

const mockSelectExploreEarnSectionEnabledFlag = jest.mocked(
  selectExploreEarnSectionEnabledFlag,
);
const mockSelectIsEarnSectionEligible = jest.mocked(
  selectIsEarnSectionEligible,
);

describe('Earn section visibility selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [true, true, true],
    [false, true, false],
    [false, false, true],
    [false, false, false],
  ])(
    'returns %s for Explore when feature flag is %s and eligibility is %s',
    (
      featureFlagEnabled: boolean,
      isExploreEarnSectionEnabled: boolean,
      isEarnSectionEligible: boolean,
    ) => {
      mockSelectExploreEarnSectionEnabledFlag.mockReturnValue(
        isExploreEarnSectionEnabled,
      );
      mockSelectIsEarnSectionEligible.mockReturnValue(isEarnSectionEligible);

      expect(selectIsExploreEarnSectionVisible({} as never)).toBe(
        featureFlagEnabled,
      );
    },
  );
});
