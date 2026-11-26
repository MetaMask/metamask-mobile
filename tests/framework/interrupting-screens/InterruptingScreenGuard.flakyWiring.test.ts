/**
 * @jest-environment node
 */
import AppiumAssertions from '../AppiumAssertions';
import AppiumGestures from '../AppiumGestures';
import Gestures from '../Gestures';
import type { AppiumElement } from '../AppiumElement';
import { FlakyRecoveryRuntime } from '../flaky-recovery/FlakyRecoverySession';
import type { FlakyDiagnosis } from '../flaky-recovery/FlakyRecoveryTypes';
import { interruptingScreenGuard } from './InterruptingScreenGuard';

type PollUntilVisible = (el: AppiumElement, timeout: number) => Promise<void>;

const WALLET_HOME =
  '<hierarchy><android.view.ViewGroup resource-id="wallet-screen"/></hierarchy>';

const createElement = () =>
  ({
    fill: jest.fn().mockResolvedValue(undefined),
    getText: jest.fn().mockResolvedValue(''),
    getAttribute: jest.fn().mockResolvedValue(null),
  }) as unknown as AppiumElement & { fill: jest.Mock };

const waitFix: FlakyDiagnosis = {
  classification: 'recoverable',
  cause: 'slow-to-appear',
  reason: 'still loading',
  solution: 'Waited for the screen to load',
  fix: { type: 'wait', waitMs: 1500 },
};

describe('AI flaky recovery wiring in shared helpers', () => {
  const previousDriver = globalThis.driver;
  let onRecovered: jest.Mock;
  let sleep: jest.Mock;

  const armGuard = () => {
    sleep = jest.fn().mockResolvedValue(undefined);
    onRecovered = jest.fn();
    interruptingScreenGuard.configure({
      flakyRecovery: new FlakyRecoveryRuntime({
        provider: { diagnose: jest.fn().mockResolvedValue(waitFix) },
        executor: {
          takeScreenshot: jest.fn().mockResolvedValue('c2NyZWVu'),
          scroll: jest.fn(),
          hideKeyboard: jest.fn(),
          sleep,
        },
        limits: {
          maxRecoveriesPerTest: 2,
          maxDiagnosesPerTest: 4,
          minStepTimeoutMs: 6_000,
          diagnosisTimeoutMs: 30_000,
        },
        test: { title: 't', file: 'f.spec.ts', retry: 0 },
        onRecovered,
      }),
    });
  };

  beforeEach(() => {
    globalThis.driver = {
      getPageSource: jest.fn().mockResolvedValue(WALLET_HOME),
    } as unknown as WebdriverIO.Browser;
  });

  afterEach(() => {
    interruptingScreenGuard.configure(undefined);
    globalThis.driver = previousDriver;
    jest.restoreAllMocks();
  });

  describe('when recovery is armed', () => {
    beforeEach(armGuard);

    it('recovers a flaky type step', async () => {
      const input = createElement();
      input.fill
        .mockRejectedValueOnce(new Error('element not interactable'))
        .mockResolvedValueOnce(undefined);

      await Gestures.typeText(Promise.resolve(input), 'hello', {
        hideKeyboard: false,
      });

      expect(input.fill).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(1500);
      expect(onRecovered).toHaveBeenCalledTimes(1);
      expect(onRecovered.mock.calls[0][0]).toMatchObject({
        step: { kind: 'type' },
        solution: 'Waited for the screen to load',
      });
    });

    it('recovers a flaky scroll-to step', async () => {
      const scrollIntoView = jest
        .spyOn(AppiumGestures, 'scrollIntoView')
        .mockRejectedValueOnce(new Error('could not scroll'))
        .mockResolvedValueOnce(undefined);

      await Gestures.scrollIntoView(Promise.resolve(createElement()));

      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(onRecovered.mock.calls[0][0]).toMatchObject({
        step: { kind: 'scroll-to' },
      });
    });

    it('recovers a flaky tap', async () => {
      const waitAndTap = jest
        .spyOn(AppiumGestures, 'waitAndTap')
        .mockRejectedValueOnce(new Error('not displayed'))
        .mockResolvedValueOnce(undefined);

      await Gestures.waitAndTap(Promise.resolve(createElement()), {
        elemDescription: 'Wallet send button',
      });

      expect(waitAndTap).toHaveBeenCalledTimes(2);
      expect(onRecovered.mock.calls[0][0]).toMatchObject({
        step: { kind: 'tap', intent: 'Wallet send button' },
      });
    });

    it('recovers a flaky visibility wait', async () => {
      const pollUntilVisible = jest
        .spyOn(
          AppiumAssertions as unknown as { pollUntilVisible: PollUntilVisible },
          'pollUntilVisible',
        )
        .mockRejectedValueOnce(new Error('not visible'))
        .mockResolvedValueOnce(undefined);

      await AppiumAssertions.expectElementToBeVisible(createElement(), {
        description: 'Account list',
        timeout: 10_000,
      });

      expect(pollUntilVisible).toHaveBeenCalledTimes(2);
      expect(onRecovered.mock.calls[0][0]).toMatchObject({
        step: { kind: 'wait', intent: 'Account list' },
      });
    });

    it('does not recover a visibility wait that asserts a value', async () => {
      const pollUntilVisible = jest
        .spyOn(
          AppiumAssertions as unknown as { pollUntilVisible: PollUntilVisible },
          'pollUntilVisible',
        )
        .mockRejectedValue(new Error('not visible'));

      await expect(
        AppiumAssertions.expectElementToBeVisible(createElement(), {
          description: 'balance is 1.5 ETH',
          timeout: 10_000,
        }),
      ).rejects.toThrow('not visible');

      expect(pollUntilVisible).toHaveBeenCalledTimes(1);
      expect(onRecovered).not.toHaveBeenCalled();
    });

    it('leaves a short-timeout presence probe alone', async () => {
      const original = new Error('not visible');
      const pollUntilVisible = jest
        .spyOn(
          AppiumAssertions as unknown as { pollUntilVisible: PollUntilVisible },
          'pollUntilVisible',
        )
        .mockRejectedValue(original);

      await expect(
        AppiumAssertions.expectElementToBeVisible(createElement(), {
          description: 'Account list',
          timeout: 1_500,
        }),
      ).rejects.toBe(original);

      expect(pollUntilVisible).toHaveBeenCalledTimes(1);
      expect(globalThis.driver?.getPageSource).not.toHaveBeenCalled();
      expect(onRecovered).not.toHaveBeenCalled();
    });

    it('leaves a short-timeout tap probe alone', async () => {
      const original = new Error('not displayed');
      const waitAndTap = jest
        .spyOn(AppiumGestures, 'waitAndTap')
        .mockRejectedValue(original);

      await expect(
        Gestures.waitAndTap(Promise.resolve(createElement()), {
          elemDescription: 'Optional skip button',
          timeout: 2_000,
        }),
      ).rejects.toBe(original);

      expect(waitAndTap).toHaveBeenCalledTimes(1);
      expect(globalThis.driver?.getPageSource).not.toHaveBeenCalled();
    });

    it('rethrows the original error when the retried step fails again', async () => {
      const original = new Error('first failure');
      const input = createElement();
      input.fill
        .mockRejectedValueOnce(original)
        .mockRejectedValueOnce(new Error('second failure'));

      await expect(
        Gestures.typeText(Promise.resolve(input), 'hello', {
          hideKeyboard: false,
        }),
      ).rejects.toBe(original);

      expect(onRecovered).not.toHaveBeenCalled();
    });
  });

  describe('when recovery is not armed (flag off / performance)', () => {
    it('does not touch the device or retry a failed type step', async () => {
      const original = new Error('element not interactable');
      const input = createElement();
      input.fill.mockRejectedValue(original);

      await expect(
        Gestures.typeText(Promise.resolve(input), 'hello', {
          hideKeyboard: false,
        }),
      ).rejects.toBe(original);

      expect(input.fill).toHaveBeenCalledTimes(1);
      expect(globalThis.driver?.getPageSource).not.toHaveBeenCalled();
    });

    it('does not retry a failed scroll-to step', async () => {
      const original = new Error('could not scroll');
      const scrollIntoView = jest
        .spyOn(AppiumGestures, 'scrollIntoView')
        .mockRejectedValue(original);

      await expect(
        Gestures.scrollIntoView(Promise.resolve(createElement())),
      ).rejects.toBe(original);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(globalThis.driver?.getPageSource).not.toHaveBeenCalled();
    });

    it('does not touch the device when a performance guard (no flaky recovery) sees a failed scroll', async () => {
      interruptingScreenGuard.configure({});
      const original = new Error('could not scroll');
      jest.spyOn(AppiumGestures, 'scrollIntoView').mockRejectedValue(original);

      await expect(
        Gestures.scrollIntoView(Promise.resolve(createElement())),
      ).rejects.toBe(original);

      expect(globalThis.driver?.getPageSource).not.toHaveBeenCalled();
    });
  });
});
