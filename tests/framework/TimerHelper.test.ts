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

describe('TimerHelper getWindow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null until the timer has been started and stopped', () => {
    const timer = new TimerHelper('window timer pending');
    expect(timer.getWindow()).toBeNull();

    timer.start();
    expect(timer.getWindow()).toBeNull();
  });

  it('returns absolute epoch start/end and is unaffected by subtractOverhead', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_600);
    const timer = new TimerHelper('window timer done');

    timer.start();
    timer.stop();
    timer.subtractOverhead(200);

    expect(timer.getWindow()).toEqual({ start: 1_000, end: 1_600 });
    expect(timer.getDuration()).toBe(400);
  });
});
