import {
  selectMoneyOnboardingSeen,
  selectMoneySplashSeen,
} from '../../../../reducers/user/selectors';
import {
  selectMoneyOnboardingStepperAnimationEnabled,
  selectMoneySplashEnabled,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import {
  selectIsMoneyOnboardingRedirectNeeded,
  selectIsMoneySplashRedirectNeeded,
  selectMoneyCtaEntryContext,
  selectMoneyEntryContext,
} from './entry';

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneyOnboardingSeen: jest.fn(),
  selectMoneySplashSeen: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
  selectMoneySplashEnabled: jest.fn(),
}));

jest.mock('./visibility', () => ({
  selectMoneyAccountAccessBlockReason: jest.fn(),
}));

const mockSelectMoneyOnboardingSeen = jest.mocked(selectMoneyOnboardingSeen);
const mockSelectMoneyOnboardingStepperAnimationEnabled = jest.mocked(
  selectMoneyOnboardingStepperAnimationEnabled,
);
const mockSelectMoneySplashSeen = jest.mocked(selectMoneySplashSeen);
const mockSelectMoneySplashEnabled = jest.mocked(selectMoneySplashEnabled);
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

describe('selectIsMoneySplashRedirectNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, true, true],
    [true, true, false],
    [false, false, false],
  ])(
    'returns %s when splash is seen: %s and enabled: %s',
    (hasSeenSplash, isSplashEnabled, expectedRedirect) => {
      mockSelectMoneySplashSeen.mockReturnValue(hasSeenSplash);
      mockSelectMoneySplashEnabled.mockReturnValue(isSplashEnabled);

      const result = selectIsMoneySplashRedirectNeeded({} as never);

      expect(result).toBe(expectedRedirect);
    },
  );
});

describe('selectMoneyCtaEntryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectMoneyOnboardingSeen.mockReturnValue(false);
    mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(true);
    mockSelectMoneyAccountAccessBlockReason.mockReturnValue(undefined);
  });

  it('targets the splash and skips onboarding while the splash is unseen', () => {
    mockSelectMoneySplashSeen.mockReturnValue(false);
    mockSelectMoneySplashEnabled.mockReturnValue(true);

    const result = selectMoneyCtaEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: false,
      isSplashRedirectNeeded: true,
    });
  });

  it('keeps onboarding when the splash flag is off', () => {
    mockSelectMoneySplashSeen.mockReturnValue(false);
    mockSelectMoneySplashEnabled.mockReturnValue(false);

    const result = selectMoneyCtaEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: true,
      isSplashRedirectNeeded: false,
    });
  });

  it('targets neither FTUE once the splash is seen', () => {
    mockSelectMoneySplashSeen.mockReturnValue(true);
    mockSelectMoneySplashEnabled.mockReturnValue(true);

    const result = selectMoneyCtaEntryContext({} as never);

    expect(result).toStrictEqual({
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: false,
      isSplashRedirectNeeded: false,
    });
  });
});
