import TimerStore from './TimerStore';

describe('TimerStore.excludeFromActiveTimers', () => {
  beforeEach(() => {
    TimerStore.resetTimers();
  });

  afterAll(() => {
    TimerStore.resetTimers();
  });

  it('moves the start of running timers forward', () => {
    TimerStore.createTimer('running');
    TimerStore.startTimer('running');
    const start = TimerStore.getTimer('running').start as number;

    const adjusted = TimerStore.excludeFromActiveTimers(1_500);

    expect(adjusted).toBe(1);
    expect(TimerStore.getTimer('running').start).toBe(start + 1_500);
  });

  it('leaves stopped and never-started timers untouched', () => {
    TimerStore.createTimer('stopped');
    TimerStore.startTimer('stopped');
    TimerStore.stopTimer('stopped');
    TimerStore.createTimer('idle');
    const stopped = { ...TimerStore.getTimer('stopped') };

    const adjusted = TimerStore.excludeFromActiveTimers(1_500);

    expect(adjusted).toBe(0);
    expect(TimerStore.getTimer('stopped')).toEqual(stopped);
    expect(TimerStore.getTimer('idle').start).toBeNull();
  });

  it.each([0, -10, Number.NaN])('ignores invalid duration %p', (duration) => {
    TimerStore.createTimer('running');
    TimerStore.startTimer('running');
    const start = TimerStore.getTimer('running').start;

    expect(TimerStore.excludeFromActiveTimers(duration)).toBe(0);
    expect(TimerStore.getTimer('running').start).toBe(start);
  });
});
