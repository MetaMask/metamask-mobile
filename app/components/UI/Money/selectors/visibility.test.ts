import { selectMoneyEnableMoneyAccountFlag } from './featureFlags';
import { selectIsMoneyAccountGeoEligible } from './eligibility';
import {
  selectIsMoneyAccountVisible,
  selectMoneyAccountAccessBlockReason,
} from './visibility';

jest.mock('./featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: jest.fn(),
}));
jest.mock('./eligibility', () => ({
  selectIsMoneyAccountGeoEligible: jest.fn(),
}));

const mockSelectMoneyEnableMoneyAccountFlag = jest.mocked(
  selectMoneyEnableMoneyAccountFlag,
);
const mockSelectIsMoneyAccountGeoEligible = jest.mocked(
  selectIsMoneyAccountGeoEligible,
);

describe('selectIsMoneyAccountVisible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [true, true, true],
    [false, true, false],
    [false, false, true],
    [false, false, false],
  ])(
    'returns %s when feature flag is %s and geo eligibility is %s',
    (
      expectedVisibility: boolean,
      isMoneyAccountEnabled: boolean,
      isMoneyAccountGeoEligible: boolean,
    ) => {
      mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(
        isMoneyAccountEnabled,
      );
      mockSelectIsMoneyAccountGeoEligible.mockReturnValue(
        isMoneyAccountGeoEligible,
      );

      const result = selectIsMoneyAccountVisible({} as never);

      expect(result).toBe(expectedVisibility);
    },
  );
});

describe('selectMoneyAccountAccessBlockReason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['feature_disabled', false, true],
    ['geo_blocked', true, false],
    ['feature_disabled', false, false],
    [undefined, true, true],
  ] as const)(
    'returns %s when feature flag is %s and geo eligibility is %s',
    (expectedReason, isMoneyAccountEnabled, isMoneyAccountGeoEligible) => {
      mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(
        isMoneyAccountEnabled,
      );
      mockSelectIsMoneyAccountGeoEligible.mockReturnValue(
        isMoneyAccountGeoEligible,
      );

      const result = selectMoneyAccountAccessBlockReason({} as never);

      expect(result).toBe(expectedReason);
    },
  );
});
