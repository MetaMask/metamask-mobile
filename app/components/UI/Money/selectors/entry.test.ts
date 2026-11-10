import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import {
  selectIsMoneyOnboardingRedirectNeeded,
  selectMoneyEntryContext,
} from './entry';

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneyOnboardingSeen: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
}));

jest.mock('./visibility', () => ({
  selectMoneyAccountAccessBlockReason: jest.fn(),
}));

const mockSelectMoneyOnboardingSeen = jest.mocked(selectMoneyOnboardingSeen);
const mockSelectMoneyOnboardingStepperAnimationEnabled = jest.mocked(
  selectMoneyOnboardingStepperAnimationEnabled,
);
const mockSelectMoneyAccountAccessBlockReason = jest.mocked(
  selectMoneyAccountAccessBlockReason,
);

describe('selectIsMoneyOnboardingRedirectNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, true, true],
    [true, true, false],
    [false, false, false],
  ])(
    'returns %s when onboarding is seen: %s and enabled: %s',
    (hasSeenOnboarding, isOnboardingEnabled, expectedRedirect) => {
      mockSelectMoneyOnboardingSeen.mockReturnValue(hasSeenOnboarding);
      mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(
        isOnboardingEnabled,
      );

      const result = selectIsMoneyOnboardingRedirectNeeded({} as never);

      expect(result).toBe(expectedRedirect);
    },
  );
});

describe('selectMoneyEntryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectMoneyOnboardingSeen.mockReturnValue(false);
    mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(true);
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue(undefined);
  });

  it('combines access policy and onboarding state', () => {
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue('geo_blocked');

    const result = selectMoneyEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: 'geo_blocked',
      isOnboardingRedirectNeeded: true,
    });
  });

  it('returns the same context reference when selector inputs are unchanged', () => {
    const state = {} as never;

    const firstResult = selectMoneyEntryContext(state);
    const secondResult = selectMoneyEntryContext(state);

    expect(secondResult).toBe(firstResult);
  });
});
