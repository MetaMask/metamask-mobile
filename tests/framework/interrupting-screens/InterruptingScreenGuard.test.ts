import type { Browser } from 'webdriverio';
import TimerStore from '../TimerStore';
import type { RecoveredLocator } from '../ai-locator/SelfHealingLocator';
import type {
  InterruptionDecision,
  InterruptionRecoveryProvider,
} from '../ai-locator/ClaudeInterruptionRecoveryProvider';
import {
  InterruptingScreenGuard,
  resolveSettleWindowMs,
  isInterruptingScreenGuardEnabledByEnv,
  type InterruptingScreenDeviceAdapter,
} from './InterruptingScreenGuard';

const WALLET_HOME =
  '<hierarchy><android.view.ViewGroup resource-id="wallet-screen"/></hierarchy>';
const EXPERIENCE_ENHANCER = [
  '<hierarchy>',
  '<android.view.ViewGroup resource-id="wallet-screen"/>',
  '<android.view.ViewGroup resource-id="experience-enhancer-modal-bottom-sheet"/>',
  '<android.widget.Button resource-id="experience-enhancer-modal-cancel-button" text="No thanks"/>',
  '</hierarchy>',
].join('');
const UNKNOWN_SURVEY =
  '<hierarchy><android.widget.Button resource-id="survey-dismiss" text="Not now"/></hierarchy>';

interface FakeAdapter extends InterruptingScreenDeviceAdapter {
  pageSources: string[];
  tapped: RecoveredLocator[];
  tappable: Set<string>;
  descriptions: Record<string, string[]>;
  clock: number;
  /** Simulated duration of every tap. */
  tapCostMs: number;
}

const createAdapter = (pageSources: string[]): FakeAdapter => {
  const adapter: FakeAdapter = {
    pageSources: [...pageSources],
    tapped: [],
    tappable: new Set([
      'experience-enhancer-modal-cancel-button',
      'survey-dismiss',
      'survey-accept',
    ]),
    descriptions: {},
    clock: 0,
    tapCostMs: 200,
    driver: () => ({}) as Browser,
    async getPageSource() {
      const next =
        adapter.pageSources.length > 1
          ? adapter.pageSources.shift()
          : adapter.pageSources[0];
      adapter.clock += 100;
      return next ?? WALLET_HOME;
    },
    async tap(locator) {
      adapter.clock += adapter.tapCostMs;
      if (!adapter.tappable.has(locator.value)) {
        return false;
      }
      adapter.tapped.push(locator);
      return true;
    },
    async describe(locator) {
      return adapter.descriptions[locator.value] ?? [];
    },
    async sleep(ms) {
      adapter.clock += ms;
    },
    now: () => adapter.clock,
  };
  return adapter;
};

const createAiProvider = (
  decision: InterruptionDecision | null,
): InterruptionRecoveryProvider & { identifyInterruption: jest.Mock } => ({
  identifyInterruption: jest.fn().mockResolvedValue(decision),
});

const surveyDecision = (
  dismissLocator: RecoveredLocator,
  dismissLabel: string,
): InterruptionDecision => ({
  blocking: true,
  screenName: 'survey-sheet',
  reason: 'Survey covers the wallet',
  dismissLabel,
  dismissLocator,
});

describe('InterruptingScreenGuard', () => {
  beforeEach(() => {
    TimerStore.resetTimers();
  });

  afterEach(() => {
    TimerStore.resetTimers();
  });

  describe('settle', () => {
    it('is a no-op when the guard is not configured', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);

      const dismissed = await guard.settle({ windowMs: 4_000 });

      expect(dismissed).toEqual([]);
      expect(adapter.tapped).toEqual([]);
    });

    it('dismisses the Experience Enhancer sheet that appears after unlock with "No thanks"', async () => {
      const adapter = createAdapter([
        WALLET_HOME,
        WALLET_HOME,
        EXPERIENCE_ENHANCER,
        WALLET_HOME,
      ]);
      const onDismissed = jest.fn();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ onDismissed });

      const dismissed = await guard.settle({
        windowMs: 4_000,
        pollIntervalMs: 500,
      });

      expect(adapter.tapped).toEqual([
        {
          strategy: 'testID',
          value: 'experience-enhancer-modal-cancel-button',
        },
      ]);
      expect(dismissed).toHaveLength(1);
      expect(onDismissed).toHaveBeenCalledWith(
        expect.objectContaining({
          screen: 'experience-enhancer-marketing-consent',
          source: 'registry',
          trigger: 'settle',
        }),
      );
    });

    it.each([0, -1])(
      'returns immediately without touching the device when the window is %p',
      async (windowMs) => {
        const adapter = createAdapter([EXPERIENCE_ENHANCER]);
        const getPageSource = jest.spyOn(adapter, 'getPageSource');
        const guard = new InterruptingScreenGuard(adapter);
        guard.configure({});

        const dismissed = await guard.settle({ windowMs });

        expect(dismissed).toEqual([]);
        expect(getPageSource).not.toHaveBeenCalled();
        expect(adapter.tapped).toEqual([]);
        expect(adapter.clock).toBe(0);
      },
    );

    it('stops polling at the end of the window when nothing appears', async () => {
      const adapter = createAdapter([WALLET_HOME]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});

      await guard.settle({ windowMs: 2_000, pollIntervalMs: 500 });

      expect(adapter.tapped).toEqual([]);
      expect(adapter.clock).toBeGreaterThanOrEqual(2_000);
      expect(adapter.clock).toBeLessThan(3_000);
    });

    it('gives up on a known screen whose dismiss control cannot be tapped', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      adapter.tappable.clear();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});

      const dismissed = await guard.settle({
        windowMs: 1_000,
        pollIntervalMs: 500,
      });

      expect(dismissed).toEqual([]);
    });

    it('excludes the settle window from a running performance timer', async () => {
      const adapter = createAdapter([WALLET_HOME]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      TimerStore.createTimer('measured');
      TimerStore.startTimer('measured');
      const startBefore = TimerStore.getTimer('measured').start as number;

      await guard.settle({ windowMs: 1_000, pollIntervalMs: 500 });

      expect(TimerStore.getTimer('measured').start).toBe(
        startBefore + adapter.clock,
      );
    });
  });

  describe('dismissKnownScreen', () => {
    it('dismisses a known sheet without asking the AI provider', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const aiProvider = createAiProvider(null);
      const onDismissed = jest.fn();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider, onDismissed });

      const dismissed = await guard.dismissKnownScreen('wait for wallet home');

      expect(dismissed).toBe(true);
      expect(aiProvider.identifyInterruption).not.toHaveBeenCalled();
      expect(onDismissed).toHaveBeenCalledWith(
        expect.objectContaining({
          screen: 'experience-enhancer-marketing-consent',
          trigger: 'wait-failure',
          intent: 'wait for wallet home',
        }),
      );
    });

    it('returns false without calling the AI when no known sheet is up', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      const aiProvider = createAiProvider(
        surveyDecision(
          { strategy: 'testID', value: 'survey-dismiss' },
          'Not now',
        ),
      );
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider });

      expect(await guard.dismissKnownScreen('wait for wallet home')).toBe(
        false,
      );
      expect(aiProvider.identifyInterruption).not.toHaveBeenCalled();
      expect(adapter.tapped).toEqual([]);
    });

    it('does not touch the device when the guard is not configured', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const getPageSource = jest.spyOn(adapter, 'getPageSource');
      const guard = new InterruptingScreenGuard(adapter);

      expect(await guard.dismissKnownScreen('wait for wallet home')).toBe(
        false,
      );
      expect(getPageSource).not.toHaveBeenCalled();
    });
  });

  describe('configure', () => {
    it('stops leftover work before it taps or overlaps the next test', async () => {
      let release: () => void = () => undefined;
      let reads = 0;
      let inFlightReads = 0;
      let maxInFlightReads = 0;
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      adapter.getPageSource = () => {
        reads += 1;
        inFlightReads += 1;
        maxInFlightReads = Math.max(maxInFlightReads, inFlightReads);
        if (reads === 1) {
          return new Promise((resolve) => {
            release = () => {
              inFlightReads -= 1;
              resolve(EXPERIENCE_ENHANCER);
            };
          });
        }
        inFlightReads -= 1;
        return Promise.resolve(WALLET_HOME);
      };
      const previousDismissed = jest.fn();
      const nextDismissed = jest.fn();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ onDismissed: previousDismissed });
      const pending = guard.settle({ windowMs: 1_000 });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      guard.configure({ onDismissed: nextDismissed });
      let nextDone = false;
      const nextSettle = guard.settle({ windowMs: 1_000 }).then((value) => {
        nextDone = true;
        return value;
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      expect(reads).toBe(1);
      expect(nextDone).toBe(false);
      release();
      const [dismissed] = await Promise.all([pending, nextSettle]);

      expect(dismissed).toEqual([]);
      expect(nextDone).toBe(true);
      expect(guard.isActive()).toBe(true);
      expect(adapter.tapped).toEqual([]);
      expect(previousDismissed).not.toHaveBeenCalled();
      expect(nextDismissed).not.toHaveBeenCalled();
      expect(maxInFlightReads).toBe(1);
      expect(reads).toBeGreaterThan(1);
    });

    it('does not charge leftover guard time to the next test timer', async () => {
      let release: () => void = () => undefined;
      let firstRead = true;
      const adapter = createAdapter([WALLET_HOME]);
      adapter.getPageSource = () => {
        if (firstRead) {
          firstRead = false;
          return new Promise((resolve) => {
            release = () => {
              resolve(WALLET_HOME);
            };
          });
        }
        return Promise.resolve(WALLET_HOME);
      };
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const pending = guard.settle({ windowMs: 1_000 });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      guard.configure({});
      TimerStore.createTimer('next');
      TimerStore.startTimer('next');
      const start = TimerStore.getTimer('next').start;
      release();
      await pending;
      await guard.settle({ windowMs: 0 });

      expect(TimerStore.getTimer('next').start).toBe(start);
    });
  });

  describe('capturePageSource', () => {
    it('hands the page source to onPageSource', async () => {
      const adapter = createAdapter([WALLET_HOME]);
      const onPageSource = jest.fn();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ onPageSource });

      await guard.capturePageSource('wallet-home-timeout');

      expect(onPageSource).toHaveBeenCalledWith(
        'wallet-home-timeout',
        WALLET_HOME,
      );
    });

    it('never hands over a secret-bearing page source', async () => {
      const adapter = createAdapter([
        '<android.widget.EditText resource-id="srp-input-word-1" text="abandon"/>',
      ]);
      const onPageSource = jest.fn();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ onPageSource });

      await guard.capturePageSource('wallet-home-timeout');

      expect(onPageSource).not.toHaveBeenCalled();
    });
  });

  describe('retryTapAfterInterruption', () => {
    const tapTarget = (
      descriptors: string[],
      displayedAfterDismiss: boolean,
    ) => ({
      intent: 'tap No thanks',
      trigger: 'tap-failure' as const,
      describeTarget: jest.fn().mockResolvedValue(descriptors),
      isTargetDisplayed: jest.fn().mockResolvedValue(displayedAfterDismiss),
    });

    it('does not retry when the dismissal tapped the control the spec aimed at', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const tap = jest.fn().mockRejectedValueOnce(new Error('not stable'));

      await guard.retryTapAfterInterruption(
        tap,
        tapTarget(
          ['experience-enhancer-modal-cancel-button', 'No thanks'],
          false,
        ),
      );

      expect(tap).toHaveBeenCalledTimes(1);
      expect(adapter.tapped).toEqual([
        {
          strategy: 'testID',
          value: 'experience-enhancer-modal-cancel-button',
        },
      ]);
    });

    it('retries when a control with the same label is still on screen', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const tap = jest
        .fn()
        .mockRejectedValueOnce(new Error('not stable'))
        .mockResolvedValueOnce(undefined);

      await guard.retryTapAfterInterruption(
        tap,
        tapTarget(['experience-enhancer-modal-cancel-button'], true),
      );

      expect(tap).toHaveBeenCalledTimes(2);
    });

    it('retries once when the dismissal tapped a different control', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const target = tapTarget(['wallet-send-button', 'Send'], false);
      const tap = jest
        .fn()
        .mockRejectedValueOnce(new Error('not displayed'))
        .mockResolvedValueOnce(undefined);

      await guard.retryTapAfterInterruption(tap, target);

      expect(tap).toHaveBeenCalledTimes(2);
      expect(target.isTargetDisplayed).not.toHaveBeenCalled();
    });
  });

  describe('retryAfterInterruption', () => {
    it('runs the action once when it succeeds', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const action = jest.fn().mockResolvedValue('ok');

      const result = await guard.retryAfterInterruption(action, {
        intent: 'tap send',
        trigger: 'tap-failure',
      });

      expect(result).toBe('ok');
      expect(action).toHaveBeenCalledTimes(1);
      expect(adapter.tapped).toEqual([]);
    });

    it('dismisses a known screen and retries the action exactly once', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('not displayed'))
        .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(action, {
        intent: 'tap send',
        trigger: 'tap-failure',
      });

      expect(action).toHaveBeenCalledTimes(2);
      expect(adapter.tapped).toHaveLength(1);
    });

    it('rethrows the original error when nothing was dismissed', async () => {
      const adapter = createAdapter([WALLET_HOME]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const error = new Error('not displayed');
      const action = jest.fn().mockRejectedValue(error);

      await expect(
        guard.retryAfterInterruption(action, {
          intent: 'tap send',
          trigger: 'tap-failure',
        }),
      ).rejects.toBe(error);
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('surfaces the retry error when the retried action fails again', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('first'))
        .mockRejectedValueOnce(new Error('second'));

      await expect(
        guard.retryAfterInterruption(action, {
          intent: 'tap send',
          trigger: 'tap-failure',
        }),
      ).rejects.toThrow('second');
      expect(action).toHaveBeenCalledTimes(2);
    });

    it('does not recurse when a dismiss tap fails inside the guard', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const nested = jest.fn();
      adapter.tap = async () => {
        nested(
          await guard.recoverFromFailure({
            intent: 'nested',
            trigger: 'tap-failure',
            error: new Error('nested'),
          }),
        );
        return false;
      };

      await expect(
        guard.retryAfterInterruption(
          () => Promise.reject(new Error('blocked')),
          { intent: 'tap send', trigger: 'tap-failure' },
        ),
      ).rejects.toThrow('blocked');
      expect(nested).toHaveBeenCalledWith(false);
    });

    it('excludes recovery time from running timers', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      TimerStore.createTimer('measured');
      TimerStore.startTimer('measured');
      const startBefore = TimerStore.getTimer('measured').start as number;
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('blocked'))
        .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(action, {
        intent: 'wait for wallet',
        trigger: 'wait-failure',
      });

      // getPageSource (100) + tap (200)
      expect(TimerStore.getTimer('measured').start).toBe(startBefore + 300);
    });
  });

  describe('AI fallback', () => {
    const failingThenPassing = () =>
      jest
        .fn()
        .mockRejectedValueOnce(new Error('blocked'))
        .mockResolvedValueOnce(undefined);

    it('dismisses an unknown overlay with the AI-suggested safe control and retries', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      adapter.descriptions['survey-dismiss'] = ['Not now'];
      const aiProvider = createAiProvider(
        surveyDecision(
          { strategy: 'testID', value: 'survey-dismiss' },
          'Not now',
        ),
      );
      const onDismissed = jest.fn();
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider, onDismissed });
      const action = failingThenPassing();

      await guard.retryAfterInterruption(action, {
        intent: 'tap send',
        trigger: 'tap-failure',
      });

      expect(action).toHaveBeenCalledTimes(2);
      expect(aiProvider.identifyInterruption).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSource: UNKNOWN_SURVEY,
          intent: 'tap send',
          primaryError: 'blocked',
        }),
      );
      expect(onDismissed).toHaveBeenCalledWith(
        expect.objectContaining({
          screen: 'survey-sheet',
          source: 'ai',
          locator: { strategy: 'testID', value: 'survey-dismiss' },
        }),
      );
    });

    it('prefers the registry and does not call the model for known screens', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const aiProvider = createAiProvider(null);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider });

      await guard.retryAfterInterruption(failingThenPassing(), {
        intent: 'tap send',
        trigger: 'tap-failure',
      });

      expect(aiProvider.identifyInterruption).not.toHaveBeenCalled();
    });

    it('refuses an AI-suggested consenting control', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      adapter.descriptions['survey-accept'] = ['I agree'];
      const aiProvider = createAiProvider(
        surveyDecision({ strategy: 'testID', value: 'survey-accept' }, 'Close'),
      );
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider });
      const error = new Error('blocked');

      await expect(
        guard.retryAfterInterruption(() => Promise.reject(error), {
          intent: 'tap send',
          trigger: 'tap-failure',
        }),
      ).rejects.toBe(error);
      expect(adapter.tapped).toEqual([]);
    });

    it('does not tap when the model reports no blocking overlay', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      const aiProvider = createAiProvider({
        blocking: false,
        screenName: 'wallet-home',
        reason: 'No overlay',
      });
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider });

      await expect(
        guard.retryAfterInterruption(
          () => Promise.reject(new Error('blocked')),
          { intent: 'tap send', trigger: 'tap-failure' },
        ),
      ).rejects.toThrow('blocked');
      expect(adapter.tapped).toEqual([]);
    });

    it('bounds AI attempts per test', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      const aiProvider = createAiProvider(null);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider, maxAiAttemptsPerTest: 2 });

      for (let attempt = 0; attempt < 4; attempt++) {
        await guard
          .retryAfterInterruption(() => Promise.reject(new Error('blocked')), {
            intent: 'tap send',
            trigger: 'tap-failure',
          })
          .catch(() => undefined);
      }

      expect(aiProvider.identifyInterruption).toHaveBeenCalledTimes(2);
    });

    it('resets the AI budget when reconfigured for the next test', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      const aiProvider = createAiProvider(null);
      const guard = new InterruptingScreenGuard(adapter);
      const fail = () =>
        guard
          .retryAfterInterruption(() => Promise.reject(new Error('blocked')), {
            intent: 'tap send',
            trigger: 'tap-failure',
          })
          .catch(() => undefined);

      guard.configure({ aiProvider, maxAiAttemptsPerTest: 1 });
      await fail();
      await fail();
      guard.configure({ aiProvider, maxAiAttemptsPerTest: 1 });
      await fail();

      expect(aiProvider.identifyInterruption).toHaveBeenCalledTimes(2);
    });

    it('treats a provider error as no dismissal', async () => {
      const adapter = createAdapter([UNKNOWN_SURVEY]);
      const aiProvider = {
        identifyInterruption: jest.fn().mockRejectedValue(new Error('429')),
      };
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({ aiProvider });

      await expect(
        guard.retryAfterInterruption(
          () => Promise.reject(new Error('blocked')),
          { intent: 'tap send', trigger: 'tap-failure' },
        ),
      ).rejects.toThrow('blocked');
    });
  });
});

describe('resolveSettleWindowMs', () => {
  it('defaults to 4s', () => {
    expect(resolveSettleWindowMs({})).toBe(4_000);
  });

  it('reads INTERRUPTING_SCREEN_SETTLE_MS', () => {
    expect(
      resolveSettleWindowMs({ INTERRUPTING_SCREEN_SETTLE_MS: '2500' }),
    ).toBe(2_500);
  });

  it('ignores invalid values', () => {
    expect(
      resolveSettleWindowMs({ INTERRUPTING_SCREEN_SETTLE_MS: 'abc' }),
    ).toBe(4_000);
  });
});

describe('isInterruptingScreenGuardEnabledByEnv', () => {
  it('is enabled by default', () => {
    expect(isInterruptingScreenGuardEnabledByEnv({})).toBe(true);
  });

  it('is disabled with INTERRUPTING_SCREEN_GUARD_ENABLED=false', () => {
    expect(
      isInterruptingScreenGuardEnabledByEnv({
        INTERRUPTING_SCREEN_GUARD_ENABLED: 'false',
      }),
    ).toBe(false);
  });
});
