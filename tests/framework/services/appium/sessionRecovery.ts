const DEVICE_HEALTH_ERROR_PATTERNS: readonly RegExp[] = [
  /pm clear/i,
  /MainActivity.*does not exist/i,
  /Activity class \{.*\} does not exist/i,
  /Cannot start the ['"].*['"] application/i,
  /session is either terminated or not started/i,
  /UiAutomation not connected/i,
  /Error executing adbExec/i,
];

let recreateRequested = false;

/** True when the error looks like emulator/session health failure, not a product assert. */
export function isDeviceHealthError(error: unknown): boolean {
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

/** Test-only reset. */
export function resetSharedSessionRecreateState(): void {
  recreateRequested = false;
}
