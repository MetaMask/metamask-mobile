import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './133';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

describe(`Migration ${migrationVersion}: wallet home onboarding steps`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged if onboarding slice is missing', () => {
    const state = {
      engine: { backgroundState: {} },
    };

    expect(migrate(state)).toBe(state);
  });

  it('adds both eligibility and steps state when missing', () => {
    const state = {
      engine: { backgroundState: {} },
      onboarding: {
        completedOnboarding: true,
      },
    };

    const result = migrate(state) as typeof state & {
      onboarding: {
        walletHomeOnboardingStepsEligible: boolean;
        walletHomeOnboardingSteps: object;
      };
    };

    expect(result.onboarding.walletHomeOnboardingStepsEligible).toBe(false);
    expect(result.onboarding.walletHomeOnboardingSteps).toEqual({
      suppressedReason: null,
      stepIndex: 0,
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('adds only steps state when eligibility already valid', () => {
    const state = {
      engine: { backgroundState: {} },
      onboarding: {
        walletHomeOnboardingStepsEligible: true,
      },
    };

    const result = migrate(state) as typeof state & {
      onboarding: { walletHomeOnboardingSteps: object };
    };

    expect(result.onboarding.walletHomeOnboardingStepsEligible).toBe(true);
    expect(result.onboarding.walletHomeOnboardingSteps).toEqual({
      suppressedReason: null,
      stepIndex: 0,
    });
  });

  it('adds only eligibility when steps state already exists', () => {
    const existing = { suppressedReason: 'flow_completed', stepIndex: 2 };
    const state = {
      engine: { backgroundState: {} },
      onboarding: {
        walletHomeOnboardingSteps: existing,
      },
    };

    const result = migrate(state) as typeof state & {
      onboarding: {
        walletHomeOnboardingStepsEligible: boolean;
        walletHomeOnboardingSteps: typeof existing;
      };
    };

    expect(result.onboarding.walletHomeOnboardingStepsEligible).toBe(false);
    expect(result.onboarding.walletHomeOnboardingSteps).toBe(existing);
  });

  it('returns state unchanged when both fields already valid', () => {
    const state = {
      engine: { backgroundState: {} },
      onboarding: {
        walletHomeOnboardingStepsEligible: true,
        walletHomeOnboardingSteps: {
          suppressedReason: null,
          stepIndex: 1,
        },
      },
    };

    expect(migrate(state)).toBe(state);
  });
});
