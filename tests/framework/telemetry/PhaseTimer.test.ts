/* eslint-disable import-x/no-nodejs-modules -- AsyncResource simulates ALS context loss across Playwright's use() boundary */
import { AsyncResource } from 'node:async_hooks';
import {
  bindPhaseTimer,
  createPhaseTimer,
  getPhaseTimer,
  getPhaseTimerAlsStore,
  recordElapsedPhase,
  recordPhase,
  recordPhaseWindow,
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

  it('records a nested step without closing the current phase', async () => {
    let now = 1_000;
    const timer = createPhaseTimer({ now: () => now });

    await runWithPhaseTimer(timer, async () => {
      startPhase('login');
      now += 4;
      await recordElapsedPhase(
        'login_app_ready',
        async () => {
          now += 20;
        },
        () => now,
      );
      now += 6;
      startPhase('test_body');
    });

    const { phases } = timer.snapshot();

    expect(phases.login).toBe(30);
    expect(phases['nested:login_app_ready']).toBe(20);
    expect(phases.test_body).toBe(0);
  });

  it('appends the step name and elapsed time when the step throws', async () => {
    let now = 5_000;
    const timer = createPhaseTimer({ now: () => now });

    const run = async () => {
      await runWithPhaseTimer(timer, async () => {
        startPhase('login');
        await recordElapsedPhase(
          'login_wallet_home',
          async () => {
            now += 162_000;
            throw new Error('Wallet home not ready within 30000ms');
          },
          () => now,
        );
      });
    };

    let caught: unknown;
    try {
      await run();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    const error = caught as Error;
    expect(error.message).toBe(
      'Wallet home not ready within 30000ms (login_wallet_home after 162000ms)',
    );
    expect(error.stack).toContain('login_wallet_home after 162000ms');

    const { phases } = timer.snapshot();

    expect(phases.login).toBe(162_000);
    expect(phases['nested:login_wallet_home']).toBe(162_000);
  });

  it('wraps a non-error rejection with the step name and elapsed time', async () => {
    let now = 0;
    const timer = createPhaseTimer({ now: () => now });

    const run = async () => {
      await runWithPhaseTimer(timer, () =>
        recordElapsedPhase(
          'login_app_ready',
          async () => {
            now += 10;
            // Non-Error rejection: the helper must still name the step.
            // eslint-disable-next-line no-throw-literal
            throw 'boom';
          },
          () => now,
        ),
      );
    };

    await expect(run()).rejects.toThrow('login_app_ready after 10ms: boom');

    expect(timer.snapshot().phases['nested:login_app_ready']).toBe(10);
  });

  describe('phase windows', () => {
    it('records an absolute window for every started phase, including repeats', () => {
      let now = 1_000;
      const timer = createPhaseTimer({ now: () => now });

      timer.start('login');
      now += 10;
      timer.start('test_body');
      now += 20;
      timer.start('login');
      now += 5;

      expect(timer.snapshot().windows).toEqual([
        { phase: 'login', startedAt: 1_000, endedAt: 1_010 },
        { phase: 'test_body', startedAt: 1_010, endedAt: 1_030 },
        { phase: 'login', startedAt: 1_030, endedAt: 1_035 },
      ]);
    });

    it('records the window of an elapsed step under its plain (un-nested) name', async () => {
      let now = 5_000;
      const timer = createPhaseTimer({ now: () => now });

      await runWithPhaseTimer(timer, async () =>
        recordElapsedPhase(
          'login_wallet_home',
          async () => {
            now += 40;
          },
          () => now,
        ),
      );

      expect(timer.snapshot().windows).toEqual([
        { phase: 'login_wallet_home', startedAt: 5_000, endedAt: 5_040 },
      ]);
      expect(timer.snapshot().phases['nested:login_wallet_home']).toBe(40);
    });

    it('records the window of a failed elapsed step', async () => {
      let now = 100;
      const timer = createPhaseTimer({ now: () => now });

      await expect(
        runWithPhaseTimer(timer, async () =>
          recordElapsedPhase(
            'login_app_ready',
            async () => {
              now += 7;
              throw new Error('nope');
            },
            () => now,
          ),
        ),
      ).rejects.toThrow('nope');

      expect(timer.snapshot().windows).toEqual([
        { phase: 'login_app_ready', startedAt: 100, endedAt: 107 },
      ]);
    });

    it('ignores invalid windows and no-ops without a bound timer', () => {
      const timer = createPhaseTimer();

      timer.recordWindow('bad', Number.NaN, 1);
      timer.recordWindow('backwards', 5, 1);

      expect(timer.snapshot().windows).toEqual([]);
      expect(() => recordPhaseWindow('x', 1, 2)).not.toThrow();
    });
  });

  it('no-ops convenience helpers when no timer is bound', () => {
    expect(() => {
      startPhase('login');
      recordPhase('app_clear', 1);
      stopPhase();
    }).not.toThrow();

    expect(getPhaseTimer()).toBeUndefined();
  });

  it('records via active binding even when AsyncLocalStorage store is unset', () => {
    let now = 1_000;
    const timer = createPhaseTimer({ now: () => now });
    const unbind = bindPhaseTimer(timer);

    try {
      expect(getPhaseTimerAlsStore()).toBeUndefined();
      expect(getPhaseTimer()).toBe(timer);
      startPhase('login');
      now += 7;
      stopPhase();
      recordPhase('fixture_bootstrap', 3);
    } finally {
      unbind();
    }

    expect(getPhaseTimer()).toBeUndefined();

    const { phases } = timer.snapshot();

    expect(phases.login).toBe(7);
    expect(phases.fixture_bootstrap).toBe(3);
  });

  it('runWithPhaseTimer keeps active binding when AsyncLocalStorage context is lost', async () => {
    let now = 1_000;
    const timer = createPhaseTimer({ now: () => now });
    // Construct outside runWithPhaseTimer so runInAsyncScope restores an empty
    // ALS store (construction-time context), forcing the activeTimer fallback.
    const resource = new AsyncResource('als-loss-probe');

    await runWithPhaseTimer(timer, async () => {
      expect(getPhaseTimerAlsStore()).toBe(timer);

      await new Promise<void>((resolve) => {
        resource.runInAsyncScope(() => {
          expect(getPhaseTimerAlsStore()).toBeUndefined();
          expect(getPhaseTimer()).toBe(timer);
          startPhase('test_body');
          now += 11;
          resolve();
        });
      });
      stopPhase();
    });

    expect(getPhaseTimer()).toBeUndefined();
    expect(timer.snapshot().phases.test_body).toBe(11);
  });

  it('runWithPhaseTimer clears active binding after async completion', async () => {
    const timer = createPhaseTimer();

    await runWithPhaseTimer(timer, async () => {
      expect(getPhaseTimer()).toBe(timer);
    });

    expect(getPhaseTimer()).toBeUndefined();
  });

  it('clears the active binding when the callback throws synchronously', () => {
    const timer = createPhaseTimer();

    expect(() =>
      runWithPhaseTimer(timer, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(getPhaseTimer()).toBeUndefined();
  });

  it('clears the active binding when the async callback rejects', async () => {
    const timer = createPhaseTimer();

    await expect(
      runWithPhaseTimer(timer, async () => {
        throw new Error('async boom');
      }),
    ).rejects.toThrow('async boom');

    expect(getPhaseTimer()).toBeUndefined();
  });

  it('nested bindPhaseTimer restores the previous active timer', () => {
    const outer = createPhaseTimer();
    const inner = createPhaseTimer();
    const unbindOuter = bindPhaseTimer(outer);
    const unbindInner = bindPhaseTimer(inner);

    expect(getPhaseTimer()).toBe(inner);
    unbindInner();
    expect(getPhaseTimer()).toBe(outer);
    unbindOuter();
    expect(getPhaseTimer()).toBeUndefined();
  });
});
