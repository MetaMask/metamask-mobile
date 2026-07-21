import {
  cancelAnimation,
  Easing,
  runOnJS,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS } from './walletHomeOnboardingChecklistRive';
import {
  animateWalletHomeOnboardingProgressRatio,
  walletHomeOnboardingProgressTimingConfig,
} from './walletHomeOnboardingProgressAnimation';

jest.mock('react-native-reanimated', () => ({
  cancelAnimation: jest.fn(),
  withTiming: jest.fn((toValue, _config, callback) => {
    callback?.(true);
    return toValue;
  }),
  runOnJS: jest.fn((fn) => fn),
  Easing: {
    out: jest.fn((easing) => easing),
    cubic: jest.fn(),
  },
}));

const createProgressRatio = (initial: number): SharedValue<number> =>
  ({ value: initial }) as unknown as SharedValue<number>;

describe('walletHomeOnboardingProgressTimingConfig', () => {
  it('returns duration and easing for the given duration', () => {
    const config = walletHomeOnboardingProgressTimingConfig(420);

    expect(config.duration).toBe(420);
    expect(config.easing).toBe(Easing.cubic);
    expect(Easing.out).toHaveBeenCalledWith(Easing.cubic);
  });
});

describe('animateWalletHomeOnboardingProgressRatio', () => {
  let progressRatio: SharedValue<number>;

  beforeEach(() => {
    jest.clearAllMocks();
    progressRatio = createProgressRatio(0);
  });

  it('cancels any in-flight animation before updating', () => {
    animateWalletHomeOnboardingProgressRatio(progressRatio, 0.5);

    expect(cancelAnimation).toHaveBeenCalledWith(progressRatio);
  });

  it('snaps immediately when instant is true', () => {
    const onComplete = jest.fn();

    animateWalletHomeOnboardingProgressRatio(progressRatio, 0.5, {
      instant: true,
      onComplete,
    });

    expect(progressRatio.value).toBe(0.5);
    expect(onComplete).toHaveBeenCalledWith(true);
    expect(withTiming).not.toHaveBeenCalled();
  });

  it('animates with the checklist duration when not instant', () => {
    animateWalletHomeOnboardingProgressRatio(progressRatio, 1);

    expect(withTiming).toHaveBeenCalledWith(
      1,
      walletHomeOnboardingProgressTimingConfig(
        WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS,
      ),
      expect.any(Function),
    );
    expect(progressRatio.value).toBe(1);
  });

  it('invokes onComplete via runOnJS when the animation finishes', () => {
    const onComplete = jest.fn();

    animateWalletHomeOnboardingProgressRatio(progressRatio, 1, { onComplete });

    expect(runOnJS).toHaveBeenCalledWith(onComplete);
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('coerces an undefined finished flag to false for onComplete', () => {
    jest
      .mocked(withTiming)
      .mockImplementationOnce((toValue, _config, callback) => {
        callback?.(undefined);
        return toValue;
      });
    const onComplete = jest.fn();

    animateWalletHomeOnboardingProgressRatio(progressRatio, 1, { onComplete });

    expect(onComplete).toHaveBeenCalledWith(false);
  });
});
