import type { Browser } from 'webdriverio';
import type { RecoveredLocator } from '../ai-locator/SelfHealingLocator';
import { FlakyRecoveryRuntime } from '../flaky-recovery/FlakyRecoverySession';
import type {
  FlakyDiagnosis,
  FlakyFixExecutor,
  FlakyRecoveryProvider,
  FlakyRecoveryRecord,
} from '../flaky-recovery/FlakyRecoveryTypes';
import {
  InterruptingScreenGuard,
  type InterruptingScreenDeviceAdapter,
} from './InterruptingScreenGuard';

const WALLET_HOME =
  '<hierarchy><android.view.ViewGroup resource-id="wallet-screen"/></hierarchy>';
const EXPERIENCE_ENHANCER = [
  '<hierarchy>',
  '<android.view.ViewGroup resource-id="experience-enhancer-modal-bottom-sheet"/>',
  '<android.widget.Button resource-id="experience-enhancer-modal-cancel-button" text="No thanks"/>',
  '</hierarchy>',
].join('');
const SECRET_SCREEN =
  '<hierarchy><android.view.ViewGroup resource-id="import-from-seed-screen"/></hierarchy>';

const SURVEY_DISMISS: RecoveredLocator = {
  strategy: 'testID',
  value: 'survey-dismiss',
};

interface FakeAdapter extends InterruptingScreenDeviceAdapter {
  pageSources: string[];
  tapped: RecoveredLocator[];
  descriptions: Record<string, string[]>;
  getPageSource: jest.Mock<Promise<string>, []>;
  clock: number;
}

const createAdapter = (pageSources: string[] = [WALLET_HOME]): FakeAdapter => {
  const adapter: FakeAdapter = {
    pageSources: [...pageSources],
    tapped: [],
    descriptions: {
      'survey-dismiss': ['Not now'],
      'survey-accept': ['I agree'],
      'send-button-v2': ['Send'],
      'wallet-delete': ['Delete wallet'],
    },
    driver: () => ({}) as Browser,
    getPageSource: jest.fn(async () =>
      adapter.pageSources.length > 1
        ? (adapter.pageSources.shift() as string)
        : adapter.pageSources[0],
    ),
    tap: jest.fn(async (locator) => {
      adapter.tapped.push(locator);
      return true;
    }),
    describe: jest.fn(
      async (locator) => adapter.descriptions[locator.value] ?? [],
    ),
    sleep: jest.fn(async (ms: number) => {
      adapter.clock += ms;
    }),
    clock: 0,
    now: () => adapter.clock,
  };
  return adapter;
};

const recoverable = (
  overrides: Partial<FlakyDiagnosis> & Pick<FlakyDiagnosis, 'cause' | 'fix'>,
): FlakyDiagnosis => ({
  classification: 'recoverable',
  reason: 'diagnosed reason',
  solution: 'applied solution',
  ...overrides,
});

interface Harness {
  guard: InterruptingScreenGuard;
  adapter: FakeAdapter;
  provider: { diagnose: jest.Mock };
  executor: jest.Mocked<FlakyFixExecutor>;
  onRecovered: jest.Mock;
  runtime: FlakyRecoveryRuntime;
}

const createHarness = (
  diagnosis: FlakyDiagnosis | null | Error,
  options: {
    pageSources?: string[];
    maxRecoveriesPerTest?: number;
    maxDiagnosesPerTest?: number;
    minStepTimeoutMs?: number;
    diagnosisTimeoutMs?: number;
  } = {},
): Harness => {
  const adapter = createAdapter(options.pageSources);
  const provider = {
    diagnose: jest.fn(async () => {
      if (diagnosis instanceof Error) {
        throw diagnosis;
      }
      return diagnosis;
    }),
  } satisfies FlakyRecoveryProvider;
  const executor: jest.Mocked<FlakyFixExecutor> = {
    takeScreenshot: jest.fn().mockResolvedValue('c2NyZWVu'),
    scroll: jest.fn().mockResolvedValue(undefined),
    hideKeyboard: jest.fn().mockResolvedValue(undefined),
    sleep: jest.fn().mockResolvedValue(undefined),
  };
  const onRecovered = jest.fn();
  const runtime = new FlakyRecoveryRuntime({
    provider,
    executor,
    limits: {
      maxRecoveriesPerTest: options.maxRecoveriesPerTest ?? 2,
      maxDiagnosesPerTest: options.maxDiagnosesPerTest ?? 4,
      minStepTimeoutMs: options.minStepTimeoutMs ?? 6_000,
      diagnosisTimeoutMs: options.diagnosisTimeoutMs ?? 30_000,
    },
    test: { title: 'a test', file: 'a.spec.ts', retry: 0 },
    onRecovered,
  });
  const guard = new InterruptingScreenGuard(adapter);
  guard.configure({ flakyRecovery: runtime });
  return { guard, adapter, provider, executor, onRecovered, runtime };
};

const failWith = (error: Error) => async (): Promise<never> => {
  throw error;
};

const wait = {
  intent: 'wait for the account list',
  trigger: 'wait-failure' as const,
};

describe('InterruptingScreenGuard with AI flaky recovery', () => {
  describe('real failures', () => {
    it('rethrows the original error unchanged when the AI says real failure', async () => {
      const { guard, adapter, onRecovered } = createHarness({
        classification: 'real-failure',
        reason: 'the app is broken',
      });
      const original = new Error('element not displayed');
      const action = jest.fn().mockRejectedValue(original);

      await expect(guard.retryAfterInterruption(action, wait)).rejects.toBe(
        original,
      );

      expect(action).toHaveBeenCalledTimes(1);
      expect(adapter.tapped).toEqual([]);
      expect(onRecovered).not.toHaveBeenCalled();
    });

    it('rethrows the original error when the AI gives no answer', async () => {
      const { guard } = createHarness(null);
      const original = new Error('boom');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);
    });

    it('rethrows the original error when the AI call throws', async () => {
      const { guard } = createHarness(new Error('429'));
      const original = new Error('boom');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);
    });

    it('rethrows the original error when the fix does not match the cause', async () => {
      const { guard, executor } = createHarness(
        recoverable({
          cause: 'unexpected-overlay',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const original = new Error('boom');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);
      expect(executor.sleep).not.toHaveBeenCalled();
    });
  });

  describe('recovered failures', () => {
    it('dismisses an unexpected overlay, retries once and reports the recovery', async () => {
      const { guard, adapter, onRecovered, runtime } = createHarness(
        recoverable({
          cause: 'unexpected-overlay',
          solution: 'Dismissed the survey with Not now',
          fix: {
            type: 'dismiss-overlay',
            label: 'Not now',
            locator: SURVEY_DISMISS,
          },
        }),
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('element not displayed'))
        .mockResolvedValueOnce('ok');

      const result = await guard.retryAfterInterruption(action, wait);

      expect(result).toBe('ok');
      expect(action).toHaveBeenCalledTimes(2);
      expect(adapter.tapped).toEqual([SURVEY_DISMISS]);
      expect(runtime.recoveries).toBe(1);
      expect(onRecovered).toHaveBeenCalledTimes(1);
      const [record, screenshots] = onRecovered.mock.calls[0] as [
        FlakyRecoveryRecord,
        { beforeBase64?: string; afterBase64?: string },
      ];
      expect(record).toMatchObject({
        recoveryIndex: 1,
        step: { kind: 'wait', intent: 'wait for the account list' },
        originalError: 'element not displayed',
        source: 'ai',
        cause: 'unexpected-overlay',
        reason: 'diagnosed reason',
        solution: 'Dismissed the survey with Not now',
        test: { title: 'a test', file: 'a.spec.ts', retry: 0 },
      });
      expect(screenshots).toEqual({
        beforeBase64: 'c2NyZWVu',
        afterBase64: 'c2NyZWVu',
      });
    });

    it('waits for a slow element and retries the step', async () => {
      const { guard, executor, onRecovered } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 4000 },
        }),
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('slow'))
        .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(action, wait);

      expect(executor.sleep).toHaveBeenCalledWith(4000);
      expect(action).toHaveBeenCalledTimes(2);
      expect(onRecovered).toHaveBeenCalledTimes(1);
    });

    it('scrolls when the target is off screen', async () => {
      const { guard, executor } = createHarness(
        recoverable({
          cause: 'needs-scroll',
          fix: { type: 'scroll', direction: 'down', times: 2 },
        }),
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('not displayed'))
        .mockResolvedValueOnce(undefined);

      await guard.retryTapAfterInterruption(action, {
        intent: 'tap send',
        trigger: 'tap-failure',
        describeTarget: async () => ['wallet-send-button'],
      });

      expect(executor.scroll).toHaveBeenCalledWith('down', 2);
      expect(action).toHaveBeenCalledTimes(2);
    });

    it('hides a keyboard that covers the target', async () => {
      const { guard, executor } = createHarness(
        recoverable({
          cause: 'keyboard-covering',
          fix: { type: 'hide-keyboard' },
        }),
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('covered'))
        .mockResolvedValueOnce(undefined);

      await guard.retryStepWithFlakyRecovery(action, {
        kind: 'tap',
        intent: 'tap continue',
      });

      expect(executor.hideKeyboard).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledTimes(2);
    });

    it('retries with an equivalent locator for a stale locator', async () => {
      const alternative: RecoveredLocator = {
        strategy: 'testID',
        value: 'send-button-v2',
      };
      const { guard, onRecovered } = createHarness(
        recoverable({
          cause: 'stale-locator',
          fix: {
            type: 'alternative-locator',
            locator: alternative,
            label: 'Send',
            equivalence: 'same button, renamed',
          },
        }),
      );
      const action = jest.fn().mockRejectedValue(new Error('no such element'));
      const retryWithLocator = jest.fn().mockResolvedValue(undefined);

      await guard.retryTapAfterInterruption(action, {
        intent: 'tap the send button',
        trigger: 'tap-failure',
        describeTarget: async () => ['wallet-send-button'],
        retryWithLocator,
      });

      expect(retryWithLocator).toHaveBeenCalledWith(alternative);
      expect(action).toHaveBeenCalledTimes(1);
      expect(onRecovered).toHaveBeenCalledTimes(1);
    });

    it('refuses an alternative locator that is a different control', async () => {
      const { guard, onRecovered } = createHarness(
        recoverable({
          cause: 'stale-locator',
          fix: {
            type: 'alternative-locator',
            locator: { strategy: 'testID', value: 'wallet-delete' },
            equivalence: 'looks similar',
          },
        }),
      );
      const original = new Error('no such element');
      const retryWithLocator = jest.fn();

      await expect(
        guard.retryTapAfterInterruption(failWith(original), {
          intent: 'tap the wallet row',
          trigger: 'tap-failure',
          describeTarget: async () => ['wallet-row'],
          retryWithLocator,
        }),
      ).rejects.toBe(original);

      expect(retryWithLocator).not.toHaveBeenCalled();
      expect(onRecovered).not.toHaveBeenCalled();
    });

    it('recovers a scroll-to step', async () => {
      const { guard, executor } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce(undefined);

      await guard.retryStepWithFlakyRecovery(action, {
        kind: 'scroll-to',
        intent: 'scroll the target element into view',
      });

      expect(executor.sleep).toHaveBeenCalledWith(2000);
      expect(action).toHaveBeenCalledTimes(2);
    });

    it('reads the target descriptors for the model', async () => {
      const { guard, provider } = createHarness({
        classification: 'real-failure',
        reason: 'x',
      });

      await guard
        .retryTapAfterInterruption(failWith(new Error('boom')), {
          intent: 'tap send',
          trigger: 'tap-failure',
          describeTarget: async () => ['wallet-send-button', 'Send'],
        })
        .catch(() => undefined);

      expect(provider.diagnose).toHaveBeenCalledWith({
        step: {
          kind: 'tap',
          intent: 'tap send',
          targetDescriptors: ['wallet-send-button', 'Send'],
          errorMessage: 'boom',
          supportsAlternativeLocator: false,
        },
        pageSource: WALLET_HOME,
        screenshotBase64: 'c2NyZWVu',
      });
    });
  });

  describe('retry failure', () => {
    it('rethrows the ORIGINAL error when the retry fails too', async () => {
      const { guard, onRecovered, runtime } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const original = new Error('original failure');
      const action = jest
        .fn()
        .mockRejectedValueOnce(original)
        .mockRejectedValueOnce(new Error('second failure'));

      await expect(guard.retryAfterInterruption(action, wait)).rejects.toBe(
        original,
      );

      expect(action).toHaveBeenCalledTimes(2);
      expect(onRecovered).not.toHaveBeenCalled();
      expect(runtime.recoveries).toBe(0);
    });

    it('still passes the test when reporting fails', async () => {
      const { guard, onRecovered } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      onRecovered.mockRejectedValue(new Error('attach failed'));
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('slow'))
        .mockResolvedValueOnce('ok');

      await expect(guard.retryAfterInterruption(action, wait)).resolves.toBe(
        'ok',
      );
    });
  });

  describe('guardrails', () => {
    it('refuses to tap a consenting control proposed as the dismiss', async () => {
      const { guard, adapter } = createHarness(
        recoverable({
          cause: 'unexpected-overlay',
          fix: {
            type: 'dismiss-overlay',
            label: 'Close',
            locator: { strategy: 'testID', value: 'survey-accept' },
          },
        }),
      );
      const original = new Error('covered');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);

      expect(adapter.tapped).toEqual([]);
    });

    it.each([
      ['balance is 1.5 ETH'],
      ['amount equals 100'],
      ['wait for expected text to be visible'],
    ])('never recovers the value assertion %p', async (intent) => {
      const { guard, provider, adapter } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const original = new Error('not displayed');

      await expect(
        guard.retryAfterInterruption(failWith(original), {
          intent,
          trigger: 'wait-failure',
        }),
      ).rejects.toBe(original);

      expect(provider.diagnose).not.toHaveBeenCalled();
      expect(adapter.getPageSource).not.toHaveBeenCalled();
    });

    it('never recovers a text comparison failure', async () => {
      const { guard, provider } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const original = new Error('Expected: "1 ETH" Received: "0 ETH"');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);
      expect(provider.diagnose).not.toHaveBeenCalled();
    });

    it('never recovers a close position tap', async () => {
      const { guard, provider } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const original = new Error('not displayed');

      await expect(
        guard.retryTapAfterInterruption(failWith(original), {
          intent: 'tap close position',
          trigger: 'tap-failure',
          describeTarget: async () => [],
        }),
      ).rejects.toBe(original);
      expect(provider.diagnose).not.toHaveBeenCalled();
    });

    it('does not call the model on a screen that can expose secrets', async () => {
      const { guard, provider, executor } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
        { pageSources: [SECRET_SCREEN] },
      );
      const original = new Error('not displayed');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);

      expect(provider.diagnose).not.toHaveBeenCalled();
      expect(executor.takeScreenshot).not.toHaveBeenCalled();
    });

    it('stops recovering after the per-test recovery budget', async () => {
      const { guard, provider, runtime } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
        { maxRecoveriesPerTest: 1 },
      );
      const flaky = (): jest.Mock =>
        jest
          .fn()
          .mockRejectedValueOnce(new Error('slow'))
          .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(flaky(), wait);
      const second = new Error('slow again');

      await expect(
        guard.retryAfterInterruption(failWith(second), wait),
      ).rejects.toBe(second);

      expect(runtime.recoveries).toBe(1);
      expect(provider.diagnose).toHaveBeenCalledTimes(1);
    });

    it('with a budget of 0 never recovers', async () => {
      const { guard, provider } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
        { maxRecoveriesPerTest: 0 },
      );
      const original = new Error('slow');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);
      expect(provider.diagnose).not.toHaveBeenCalled();
    });

    it('caps model calls per test, including real-failure verdicts', async () => {
      const { guard, provider } = createHarness(
        { classification: 'real-failure', reason: 'x' },
        { maxDiagnosesPerTest: 2 },
      );

      for (let attempt = 0; attempt < 4; attempt++) {
        await guard
          .retryAfterInterruption(failWith(new Error('boom')), wait)
          .catch(() => undefined);
      }

      expect(provider.diagnose).toHaveBeenCalledTimes(2);
    });
  });

  describe('presence probes', () => {
    it('does nothing for a step whose timeout is below the probe threshold', async () => {
      const { guard, adapter, provider, executor } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
        { pageSources: [EXPERIENCE_ENHANCER] },
      );
      const original = new Error('not visible');
      const action = jest.fn().mockRejectedValue(original);

      await expect(
        guard.retryAfterInterruption(action, { ...wait, timeoutMs: 1_500 }),
      ).rejects.toBe(original);

      expect(action).toHaveBeenCalledTimes(1);
      expect(adapter.getPageSource).not.toHaveBeenCalled();
      expect(adapter.tapped).toEqual([]);
      expect(provider.diagnose).not.toHaveBeenCalled();
      expect(executor.takeScreenshot).not.toHaveBeenCalled();
    });

    it('recovers a step whose timeout reaches the probe threshold', async () => {
      const { guard, onRecovered } = createHarness(
        recoverable({
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 2000 },
        }),
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('slow'))
        .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(action, { ...wait, timeoutMs: 6_000 });

      expect(onRecovered).toHaveBeenCalledTimes(1);
    });

    it('applies the threshold to taps and scroll / type steps too', async () => {
      const { guard, adapter } = createHarness(null);
      const original = new Error('boom');

      await expect(
        guard.retryTapAfterInterruption(failWith(original), {
          intent: 'tap optional skip',
          trigger: 'tap-failure',
          timeoutMs: 2_000,
          describeTarget: async () => [],
        }),
      ).rejects.toBe(original);
      await expect(
        guard.retryStepWithFlakyRecovery(failWith(original), {
          kind: 'scroll-to',
          intent: 'scroll',
          timeoutMs: 3_000,
        }),
      ).rejects.toBe(original);

      expect(adapter.getPageSource).not.toHaveBeenCalled();
    });
  });

  describe('cost bounds', () => {
    it('rethrows the original error when the model does not answer in time', async () => {
      const { guard, provider, onRecovered } = createHarness(null, {
        diagnosisTimeoutMs: 10,
      });
      provider.diagnose.mockImplementation(
        async () => new Promise(() => undefined),
      );
      const original = new Error('slow');

      await expect(
        guard.retryAfterInterruption(failWith(original), wait),
      ).rejects.toBe(original);
      expect(onRecovered).not.toHaveBeenCalled();
    });

    it('takes no screenshot once the model budget is used and no known screen is up', async () => {
      const { guard, executor } = createHarness(
        { classification: 'real-failure', reason: 'x' },
        { maxDiagnosesPerTest: 1 },
      );

      await guard
        .retryAfterInterruption(failWith(new Error('first')), wait)
        .catch(() => undefined);
      await guard
        .retryAfterInterruption(failWith(new Error('second')), wait)
        .catch(() => undefined);

      expect(executor.takeScreenshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('known screens fast path', () => {
    it('dismisses a registry screen without calling the model and reports it', async () => {
      const { guard, adapter, provider, onRecovered } = createHarness(
        { classification: 'real-failure', reason: 'unused' },
        { pageSources: [EXPERIENCE_ENHANCER] },
      );
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('covered'))
        .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(action, wait);

      expect(provider.diagnose).not.toHaveBeenCalled();
      expect(adapter.tapped).toEqual([
        {
          strategy: 'testID',
          value: 'experience-enhancer-modal-cancel-button',
        },
      ]);
      expect(onRecovered).toHaveBeenCalledTimes(1);
      expect(onRecovered.mock.calls[0][0]).toMatchObject({
        source: 'registry',
        cause: 'unexpected-overlay',
        fix: {
          type: 'registry-dismiss',
          screen: 'experience-enhancer-marketing-consent',
        },
      });
    });

    it('dismisses the wallet-home onboarding card with its skip button', async () => {
      const card = [
        '<hierarchy>',
        '<android.view.ViewGroup resource-id="wallet-home-onboarding-steps"/>',
        '<android.widget.Button resource-id="wallet-home-onboarding-steps-skip" text="Skip"/>',
        '</hierarchy>',
      ].join('');
      const { guard, adapter, provider } = createHarness(null, {
        pageSources: [card, WALLET_HOME],
      });
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('covered'))
        .mockResolvedValueOnce(undefined);

      await guard.retryAfterInterruption(action, wait);

      expect(adapter.tapped).toEqual([
        { strategy: 'testID', value: 'wallet-home-onboarding-steps-skip' },
      ]);
      expect(provider.diagnose).not.toHaveBeenCalled();
    });

    it('does not retry a tap the dismissal already performed', async () => {
      const { guard, onRecovered } = createHarness(null, {
        pageSources: [EXPERIENCE_ENHANCER, WALLET_HOME],
      });
      const tap = jest.fn().mockRejectedValue(new Error('covered'));

      await guard.retryTapAfterInterruption(tap, {
        intent: 'tap no thanks',
        trigger: 'tap-failure',
        describeTarget: async () => ['experience-enhancer-modal-cancel-button'],
      });

      expect(tap).toHaveBeenCalledTimes(1);
      expect(onRecovered).toHaveBeenCalledTimes(1);
    });
  });

  describe('happy path', () => {
    it('does nothing when the step passes', async () => {
      const { guard, adapter, provider, executor } = createHarness(null);
      const action = jest.fn().mockResolvedValue('ok');

      await expect(guard.retryAfterInterruption(action, wait)).resolves.toBe(
        'ok',
      );
      await guard.retryStepWithFlakyRecovery(action, {
        kind: 'type',
        intent: 'type',
      });

      expect(adapter.getPageSource).not.toHaveBeenCalled();
      expect(provider.diagnose).not.toHaveBeenCalled();
      expect(executor.takeScreenshot).not.toHaveBeenCalled();
    });

    it('skips the post-login settle window and polling dismissals', async () => {
      const { guard, adapter } = createHarness(null, {
        pageSources: [EXPERIENCE_ENHANCER],
      });

      await expect(guard.settle({ windowMs: 4000 })).resolves.toEqual([]);
      await expect(
        guard.dismissKnownScreen('wait for wallet home'),
      ).resolves.toBe(false);

      expect(adapter.getPageSource).not.toHaveBeenCalled();
      expect(adapter.tapped).toEqual([]);
    });
  });

  describe('disabled-mode parity', () => {
    it('runs the step exactly once and rethrows when the guard is not configured', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      const original = new Error('boom');
      const action = jest.fn().mockRejectedValue(original);

      await expect(
        guard.retryStepWithFlakyRecovery(action, {
          kind: 'tap',
          intent: 'tap',
        }),
      ).rejects.toBe(original);
      await expect(guard.retryAfterInterruption(action, wait)).rejects.toBe(
        original,
      );

      expect(action).toHaveBeenCalledTimes(2);
      expect(adapter.getPageSource).not.toHaveBeenCalled();
      expect(adapter.tapped).toEqual([]);
    });

    it('leaves a performance-style guard (no flakyRecovery) untouched for scroll / type steps', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const original = new Error('boom');
      const action = jest.fn().mockRejectedValue(original);

      await expect(
        guard.retryStepWithFlakyRecovery(action, {
          kind: 'scroll-to',
          intent: 'scroll',
        }),
      ).rejects.toBe(original);

      expect(action).toHaveBeenCalledTimes(1);
      expect(adapter.getPageSource).not.toHaveBeenCalled();
    });

    it('keeps the performance dismiss-and-retry behavior when no flakyRecovery is configured', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER, WALLET_HOME]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});
      const action = jest
        .fn()
        .mockRejectedValueOnce(new Error('covered'))
        .mockResolvedValueOnce('ok');

      await expect(guard.retryAfterInterruption(action, wait)).resolves.toBe(
        'ok',
      );

      expect(adapter.tapped).toEqual([
        {
          strategy: 'testID',
          value: 'experience-enhancer-modal-cancel-button',
        },
      ]);
    });

    it('still runs the settle window when no flakyRecovery is configured', async () => {
      const adapter = createAdapter([EXPERIENCE_ENHANCER, WALLET_HOME]);
      const guard = new InterruptingScreenGuard(adapter);
      guard.configure({});

      const dismissed = await guard.settle({
        windowMs: 1000,
        pollIntervalMs: 100,
      });

      expect(dismissed).toHaveLength(1);
    });
  });
});
