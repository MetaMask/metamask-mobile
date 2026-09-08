import {
  formatScreenTtcAccessibilityLabel,
  getAllScreenTtc,
  getScreenTtc,
  isScreenTtcProbeEnabled,
  parseScreenTtcAccessibilityLabel,
  recordScreenTtc,
  screenTtcTestId,
  subscribeScreenTtc,
  _resetScreenTtcRegistryForTesting,
  _setScreenTtcProbeEnabledForTesting,
} from './screenTtcRegistry';
import { OnboardingScreenIds } from './onboardingPerformanceIds';

jest.mock('../../util/test/utils', () => ({
  isE2EOrPerformanceTest: true,
}));

describe('screenTtcRegistry', () => {
  beforeEach(() => {
    _resetScreenTtcRegistryForTesting();
  });

  it('reports probe enabled from e2e/perf flag and test override', () => {
    expect(isScreenTtcProbeEnabled()).toBe(true);
    _setScreenTtcProbeEnabledForTesting(false);
    expect(isScreenTtcProbeEnabled()).toBe(false);
    _setScreenTtcProbeEnabledForTesting(undefined);
    expect(isScreenTtcProbeEnabled()).toBe(true);
  });

  it('records and formats TTC for Appium consumption', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_LANDING, 123.4, 'filled');

    const stored = getScreenTtc(OnboardingScreenIds.ONBOARDING_LANDING);
    expect(stored).toEqual({
      screenId: OnboardingScreenIds.ONBOARDING_LANDING,
      durationMs: 123.4,
      contentState: 'filled',
      generation: 1,
    });
    expect(getAllScreenTtc()).toHaveLength(1);

    expect(stored).toBeDefined();
    if (!stored) {
      throw new Error('expected stored TTC record');
    }

    const label = formatScreenTtcAccessibilityLabel(stored);
    expect(label).toBe('ttc:onboarding_landing:123:1');
    expect(screenTtcTestId(OnboardingScreenIds.ONBOARDING_LANDING)).toBe(
      'perf-ttc-onboarding_landing',
    );
    expect(parseScreenTtcAccessibilityLabel(label)).toEqual({
      screenId: OnboardingScreenIds.ONBOARDING_LANDING,
      durationMs: 123,
      contentState: 'filled',
      generation: 1,
    });
  });

  it('returns null for malformed accessibility labels', () => {
    expect(parseScreenTtcAccessibilityLabel('not-a-ttc-label')).toBeNull();
    expect(parseScreenTtcAccessibilityLabel('ttc:bad')).toBeNull();
    expect(parseScreenTtcAccessibilityLabel('  ')).toBeNull();
  });

  it('clamps negative durations and skips recording when probe disabled', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, -5, 'empty');
    expect(getScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET)?.durationMs).toBe(
      0,
    );
    expect(
      getScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET)?.contentState,
    ).toBe('empty');

    _setScreenTtcProbeEnabledForTesting(false);
    recordScreenTtc(OnboardingScreenIds.CHOOSE_PASSWORD, 50, 'filled');
    expect(getScreenTtc(OnboardingScreenIds.CHOOSE_PASSWORD)).toBeUndefined();
  });

  it('bumps generation on each record for the same screen', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 10, 'filled');
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 20, 'filled');

    const second = getScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET);
    expect(second?.generation).toBe(2);
    expect(second?.durationMs).toBe(20);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeScreenTtc(listener);

    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SUCCESS, 40, 'filled');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SUCCESS, 50, 'filled');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
