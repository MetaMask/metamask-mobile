import {
  selectEarnHomeSectionEnabledFlag,
  selectExploreEarnSectionEnabledFlag,
} from './featureFlags';
import { selectIsEarnSectionEligible } from './eligibility';
import {
  selectIsExploreEarnSectionVisible,
  selectIsHomepageEarnSectionVisible,
} from './visibility';

jest.mock('./featureFlags', () => ({
  selectEarnHomeSectionEnabledFlag: jest.fn(),
  selectExploreEarnSectionEnabledFlag: jest.fn(),
}));
jest.mock('./eligibility', () => ({
  selectIsEarnSectionEligible: jest.fn(),
}));

const mockSelectEarnHomeSectionEnabledFlag = jest.mocked(
  selectEarnHomeSectionEnabledFlag,
);
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

  it.each([
    [true, true, true],
    [false, true, false],
    [false, false, true],
    [false, false, false],
  ])(
    'returns %s for Homepage when feature flag is %s and eligibility is %s',
    (
      featureFlagEnabled: boolean,
      isHomepageEarnSectionEnabled: boolean,
      isEarnSectionEligible: boolean,
    ) => {
      mockSelectEarnHomeSectionEnabledFlag.mockReturnValue(
        isHomepageEarnSectionEnabled,
      );
      mockSelectIsEarnSectionEligible.mockReturnValue(isEarnSectionEligible);

      expect(selectIsHomepageEarnSectionVisible({} as never)).toBe(
        featureFlagEnabled,
      );
    },
  );
});
