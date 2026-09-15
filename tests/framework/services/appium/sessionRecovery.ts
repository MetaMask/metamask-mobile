import { isUiAutomator2SessionDeadError } from '../../Constants.ts';

const DEVICE_HEALTH_ERROR_PATTERNS: readonly RegExp[] = [
  /pm clear/i,
  /MainActivity.*does not exist/i,
  /Activity class \{.*\} does not exist/i,
  /Cannot start the ['"].*['"] application/i,
  /session is either terminated or not started/i,
  /UiAutomation not connected/i,
  /Error executing adbExec/i,
  // Shared-adb / N=2 worker races: reverse --remove crashes the adb daemon and
  // the sibling worker's element commands die with socket hang up / proxy errors.
  /socket hang up/i,
  /Could not proxy command to the remote server/i,
  /device offline/i,
  /protocol fault/i,
];

let recreateRequested = false;

/**
 * In-process recreate hook installed by the Playwright driver fixture while a
 * test is running. Soft-reload can call this to recover from UiAutomator2 death
 * without waiting for the next Playwright retry.
 */
export type SharedSessionRecreateHandler = () => Promise<WebdriverIO.Browser>;

let sharedSessionRecreateHandler: SharedSessionRecreateHandler | undefined;

/** True when the error looks like emulator/session health failure, not a product assert. */
export function isDeviceHealthError(error: unknown): boolean {
  if (isUiAutomator2SessionDeadError(error)) {
    return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    message.length > 0 &&
    DEVICE_HEALTH_ERROR_PATTERNS.some((pattern) => pattern.test(message))
  );
}

/** Ask the next driver fixture setup to drop the reused WebDriver session. */
export function requestSharedSessionRecreate(): void {
  recreateRequested = true;
}

/** Consume and clear a pending recreate request. */
export function consumeSharedSessionRecreate(): boolean {
  const requested = recreateRequested;
  recreateRequested = false;
  return requested;
}

/**
 * Register (or clear) the in-process session recreate handler.
 * The driver fixture owns the lifecycle — set before `use(drv)`, clear in finally.
 */
export function setSharedSessionRecreateHandler(
  handler: SharedSessionRecreateHandler | undefined,
): void {
  sharedSessionRecreateHandler = handler;
}

/**
 * Recreate the shared WebDriver session now (same Playwright attempt).
 * Returns undefined when no handler is registered (e.g. unit tests without the fixture).
 * Clears the pending recreate flag so the next fixture setup does not double-recreate.
 */
export async function recreateSharedSessionNow(): Promise<
  WebdriverIO.Browser | undefined
> {
  const handler = sharedSessionRecreateHandler;
  if (!handler) {
    return undefined;
  }
  // In-process recreate consumes the flag; the new session is already healthy.
  recreateRequested = false;
  return handler();
}

/** Test-only reset. */
export function resetSharedSessionRecreateState(): void {
  recreateRequested = false;
  sharedSessionRecreateHandler = undefined;
}
