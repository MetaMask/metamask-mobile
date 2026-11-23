import TimerHelper from './TimerHelper';
import {
  THRESHOLD_MARGIN,
  THRESHOLD_MARGIN_PERCENT,
} from './quality-gates/thresholdMargin';

describe('TimerHelper threshold margin', () => {
  it('applies a 15% margin on top of the platform base threshold', () => {
    const android = new TimerHelper(
      'android timer',
      { ios: 1000, android: 2000 },
      'android',
    );
    const ios = new TimerHelper(
      'ios timer',
      { ios: 1000, android: 2000 },
      'ios',
    );

    expect(android.threshold).toBe(2300);
    expect(ios.threshold).toBe(1150);
  });

  it('returns no threshold when none is defined', () => {
    expect(new TimerHelper('no threshold timer').threshold).toBeNull();
  });

  it('keeps the percent and fractional margin constants in sync', () => {
    expect(THRESHOLD_MARGIN_PERCENT).toBe(15);
    expect(THRESHOLD_MARGIN).toBeCloseTo(THRESHOLD_MARGIN_PERCENT / 100);
  });
});
