import {
  createPhaseTimer,
  getPhaseTimer,
  recordPhase,
  runWithPhaseTimer,
  startPhase,
  stopPhase,
} from './PhaseTimer.ts';

describe('PhaseTimer', () => {
  it('accumulates duration when the same phase is started again after another phase', () => {
    let now = 1_000;
    const timer = createPhaseTimer({ now: () => now });

    timer.start('test_body');
    now += 20;
    timer.start('login');
    now += 10;
    timer.start('test_body');
    now += 15;
    timer.stop();

    const { phases } = timer.snapshot();

    expect(phases.login).toBe(10);
    expect(phases.test_body).toBe(35);
  });

  it('records absolute durations without stopping the current phase', () => {
    let now = 1_000;
    const timer = createPhaseTimer({ now: () => now });

    timer.start('test_body');
    timer.record('app_clear', 100);
    timer.record('app_clear', 50);
    now += 10;
    timer.stop();

    const { phases } = timer.snapshot();

    expect(phases.app_clear).toBe(150);
    expect(phases.test_body).toBe(10);
  });

  it('ignores non-finite or negative recorded durations', () => {
    const timer = createPhaseTimer();

    timer.record('app_launch', Number.NaN);
    timer.record('app_launch', -5);
    timer.record('app_launch', 42);

    expect(timer.snapshot().phases.app_launch).toBe(42);
  });

  it('merges meta via setMeta', () => {
    const timer = createPhaseTimer();

    timer.setMeta({ platform: 'android', sessionReused: true });
    timer.setMeta({ title: 'example', retry: 1 });

    expect(timer.snapshot().meta).toEqual({
      platform: 'android',
      sessionReused: true,
      title: 'example',
      retry: 1,
    });
  });

  it('binds the timer to AsyncLocalStorage for nested helpers', async () => {
    let now = 1_000;
    const timer = createPhaseTimer({ now: () => now });

    await runWithPhaseTimer(timer, async () => {
      expect(getPhaseTimer()).toBe(timer);
      startPhase('login');
      now += 5;
      stopPhase();
      recordPhase('fixture_bootstrap', 12);
    });

    expect(getPhaseTimer()).toBeUndefined();

    const { phases } = timer.snapshot();

    expect(phases.login).toBe(5);
    expect(phases.fixture_bootstrap).toBe(12);
  });

  it('no-ops convenience helpers when no timer is bound', () => {
    expect(() => {
      startPhase('login');
      recordPhase('app_clear', 1);
      stopPhase();
    }).not.toThrow();

    expect(getPhaseTimer()).toBeUndefined();
  });
});
