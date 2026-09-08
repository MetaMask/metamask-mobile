import {
  formatScreenTtcAccessibilityLabel,
  parseScreenTtcAccessibilityLabel,
  recordScreenTtc,
  screenTtcTestId,
  _resetScreenTtcRegistryForTesting,
} from './screenTtcRegistry';
import { OnboardingScreenIds } from './onboardingPerformanceIds';

jest.mock('../../util/test/utils', () => ({
  isE2EOrPerformanceTest: true,
}));

describe('screenTtcRegistry', () => {
  beforeEach(() => {
    _resetScreenTtcRegistryForTesting();
  });

  it('records and formats TTC for Appium consumption', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_LANDING, 123.4, 'filled');

    const label = formatScreenTtcAccessibilityLabel({
      screenId: OnboardingScreenIds.ONBOARDING_LANDING,
      durationMs: 123.4,
      contentState: 'filled',
      generation: 1,
    });

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

  it('bumps generation on each record for the same screen', () => {
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 10, 'filled');
    recordScreenTtc(OnboardingScreenIds.ONBOARDING_SHEET, 20, 'filled');

    const second = parseScreenTtcAccessibilityLabel(
      formatScreenTtcAccessibilityLabel({
        screenId: OnboardingScreenIds.ONBOARDING_SHEET,
        durationMs: 20,
        contentState: 'filled',
        generation: 2,
      }),
    );

    expect(second?.generation).toBe(2);
    expect(second?.durationMs).toBe(20);
  });
});
