import { createPlaywrightLogger } from '../../playwrightLogger.ts';

const logger = createPlaywrightLogger('sessionRecovery');

/**
 * Patterns that indicate the emulator/simulator or Appium session is unhealthy
 * enough that soft-reload retries on a reused WebDriver session will cascade.
 */
const DEVICE_HEALTH_ERROR_PATTERNS: readonly RegExp[] = [
  /pm clear/i,
  /MainActivity.*does not exist/i,
  /Activity class \{.*\} does not exist/i,
  /Cannot start the ['"].*['"] application/i,
  /session is either terminated or not started/i,
  /UiAutomation not connected/i,
  /instrumentation process is not running/i,
  /adb(?:Exec)?.*exited with code/i,
  /Error executing adbExec/i,
  /connect ECONNREFUSED.*5037/i,
];

interface SharedSessionRecreateState {
  requested: boolean;
  reason?: string;
}

let sharedSessionRecreateState: SharedSessionRecreateState = {
  requested: false,
};

/**
 * Returns whether an error indicates device/session health failure rather than
 * an ordinary product assertion failure.
 */
export function isDeviceHealthError(error: unknown): boolean {
  const message = getErrorMessage(error);
  if (!message) {
    return false;
  }

  return DEVICE_HEALTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Ask the next `driver` fixture setup to drop the reused WebDriver session and
 * create a fresh one. Soft reload / fixture failures use this so Playwright
 * retries and later tests do not cascade on a poisoned reused session.
 */
export function requestSharedSessionRecreate(reason: string): void {
  const trimmedReason = reason.trim() || 'unspecified device health failure';
  if (!sharedSessionRecreateState.requested) {
    sharedSessionRecreateState = {
      requested: true,
      reason: trimmedReason,
    };
    logger.warn(
      `Shared WebDriver session marked for recreate: ${trimmedReason}`,
    );
    return;
  }

  logger.debug(
    `Shared WebDriver session recreate already requested (${sharedSessionRecreateState.reason}); ignoring: ${trimmedReason}`,
  );
}

/**
 * Consume a pending recreate request (clears the flag).
 */
export function consumeSharedSessionRecreate(): {
  requested: boolean;
  reason?: string;
} {
  if (!sharedSessionRecreateState.requested) {
    return { requested: false };
  }

  const snapshot = { ...sharedSessionRecreateState };
  sharedSessionRecreateState = { requested: false };
  return {
    requested: true,
    reason: snapshot.reason,
  };
}

/**
 * Test-only reset for module state between Jest cases.
 */
export function resetSharedSessionRecreateState(): void {
  sharedSessionRecreateState = { requested: false };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}
