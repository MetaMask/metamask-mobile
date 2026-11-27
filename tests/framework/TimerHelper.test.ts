import TimerHelper, { measureTransition } from './TimerHelper';
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

describe('TimerHelper networkOnly', () => {
  it('ignores thresholds and stays out of the total', () => {
    const timer = new TimerHelper(
      'window only',
      { ios: 1000, android: 2000 },
      'android',
      { networkOnly: true },
    );

    expect(timer.networkOnly).toBe(true);
    expect(timer.threshold).toBeNull();
    expect(timer.baseThreshold).toBeNull();
    expect(timer.hasThreshold()).toBe(false);
    expect(timer.includeInTotal).toBe(false);
  });

  it('keeps regular timers thresholded and in the total', () => {
    const timer = new TimerHelper(
      'regular',
      { ios: 1000, android: 2000 },
      'android',
    );

    expect(timer.networkOnly).toBe(false);
    expect(timer.threshold).toBe(2300);
    expect(timer.includeInTotal).toBe(true);
  });

  it('measures wall clock without Appium overhead subtraction', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_500);
    const timer = new TimerHelper('window only measure', undefined, undefined, {
      networkOnly: true,
    });
    const subtractOverhead = jest.spyOn(timer, 'subtractOverhead');

    await timer.measure(async () => undefined);

    expect(subtractOverhead).not.toHaveBeenCalled();
    expect(timer.getWindow()).toEqual({ start: 1_000, end: 1_500 });
    jest.restoreAllMocks();
  });
});

describe('measureTransition', () => {
  it('starts the timer before the tap and stops after the destination is ready', async () => {
    const timer = new TimerHelper('transition', undefined, undefined, {
      networkOnly: true,
    });
    const order: string[] = [];

    await measureTransition(
      timer,
      async () => {
        order.push(`tap:${timer.getWindow() === null ? 'running' : 'done'}`);
      },
      async () => {
        order.push('ready');
      },
    );

    expect(order).toEqual(['tap:running', 'ready']);
    expect(timer.getWindow()).not.toBeNull();
  });
});
