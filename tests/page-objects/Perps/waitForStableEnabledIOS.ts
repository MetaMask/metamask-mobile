import Utilities, { sleep } from '../../framework/Utilities';

async function waitForStableElementEnabled(
  detoxElement: DetoxElement,
  options: {
    timeout?: number;
    pollIntervalMs?: number;
    consecutiveSuccess?: number;
  } = {},
): Promise<void> {
  const {
    timeout = 20000,
    pollIntervalMs = 100,
    consecutiveSuccess = 4,
  } = options;

  const deadline = Date.now() + timeout;
  let streak = 0;

  while (Date.now() < deadline) {
    try {
      await Utilities.checkElementEnabled(detoxElement);
      streak += 1;
      if (streak >= consecutiveSuccess) {
        return;
      }
    } catch {
      streak = 0;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Element was not stably enabled (${consecutiveSuccess} consecutive checks) within ${timeout}ms`,
  );
}

/**
 * On iOS, {@link Utilities.checkElementReadyState} does not assert `enabled`, so
 * {@link Gestures.waitAndTap} can tap before async validation settles. Poll until several
 * consecutive {@link Utilities.checkElementEnabled} passes. No-op on Android (enabled is already
 * enforced there before tap).
 */
export async function waitForStableEnabledIOS(
  detoxElement: DetoxElement,
  options: {
    timeout?: number;
    pollIntervalMs?: number;
    consecutiveSuccess?: number;
  } = {},
): Promise<void> {
  if (device.getPlatform() !== 'ios') {
    return;
  }
  await waitForStableElementEnabled(detoxElement, options);
}
