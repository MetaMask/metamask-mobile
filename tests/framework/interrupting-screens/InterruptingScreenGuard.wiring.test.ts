/**
 * @jest-environment node
 */
import AppiumAssertions from '../AppiumAssertions';
import AppiumGestures from '../AppiumGestures';
import Gestures from '../Gestures';
import Utilities from '../Utilities';
import type { AppiumElement } from '../AppiumElement';
import { interruptingScreenGuard } from './InterruptingScreenGuard';

type PollUntilVisible = (el: AppiumElement, timeout: number) => Promise<void>;

const visibleTarget = {} as AppiumElement;

describe('interrupting screen guard wiring', () => {
  let pollUntilVisible: jest.SpyInstance;
  let recoverFromFailure: jest.SpyInstance;

  beforeEach(() => {
    pollUntilVisible = jest.spyOn(
      AppiumAssertions as unknown as { pollUntilVisible: PollUntilVisible },
      'pollUntilVisible',
    );
    recoverFromFailure = jest
      .spyOn(interruptingScreenGuard, 'recoverFromFailure')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retries a failed visibility wait once after the guard dismisses a screen', async () => {
    pollUntilVisible
      .mockRejectedValueOnce(new Error('not visible'))
      .mockResolvedValueOnce(undefined);

    await AppiumAssertions.expectElementToBeVisible(visibleTarget, {
      description: 'Wallet balance',
      timeout: 1_000,
    });

    expect(pollUntilVisible).toHaveBeenCalledTimes(2);
    expect(recoverFromFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'Wallet balance',
        trigger: 'wait-failure',
      }),
    );
  });

  it('does not involve the guard for presence probes', async () => {
    pollUntilVisible.mockRejectedValue(new Error('not visible'));

    const visible = await Utilities.isElementVisible(
      Promise.resolve(visibleTarget),
      500,
    );

    expect(visible).toBe(false);
    expect(pollUntilVisible).toHaveBeenCalledTimes(1);
    expect(recoverFromFailure).not.toHaveBeenCalled();
  });

  it('retries a failed tap once after the guard dismisses a screen', async () => {
    const waitAndTap = jest
      .spyOn(AppiumGestures, 'waitAndTap')
      .mockRejectedValueOnce(new Error('not displayed'))
      .mockResolvedValueOnce(undefined);

    await Gestures.waitAndTap(Promise.resolve(visibleTarget), {
      elemDescription: 'Wallet send button',
    });

    expect(waitAndTap).toHaveBeenCalledTimes(2);
    expect(recoverFromFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'Wallet send button',
        trigger: 'tap-failure',
      }),
    );
  });
});
