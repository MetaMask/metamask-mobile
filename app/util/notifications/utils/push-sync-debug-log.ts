/**
 * TEMPORARY debug logging for the push OS-permission analytics sync.
 * Remove before merging.
 *
 * Goes through `console.log`, which Hermes forwards to the iOS system log via
 * `nativeLoggingHook` (os_log subsystem `com.facebook.react.log`, category
 * `javascript`). Follow it with:
 * `xcrun simctl spawn booted log stream --level debug --predicate
 * 'eventMessage CONTAINS "PUSH_SYNC_DEBUG"'`
 *
 * The `--level debug` flag is required: JS console output is emitted at
 * os_log info/debug level, which `log stream` hides by default.
 */
export const PUSH_SYNC_DEBUG_TAG = 'PUSH_SYNC_DEBUG';

/**
 * @param data - Pass a thunk so that reading the values being inspected cannot
 * throw into the code under investigation; anything that fails is reported as
 * part of the log line instead.
 */
export const pushSyncDebugLog = (
  step: string,
  data?: () => Record<string, unknown>,
): void => {
  let payload = '';

  if (data) {
    try {
      payload = ` ${JSON.stringify(data())}`;
    } catch (error) {
      payload = ` <log-data-failed: ${(error as Error)?.message}>`;
    }
  }

  try {
    // eslint-disable-next-line no-console
    console.log(`[${PUSH_SYNC_DEBUG_TAG}] ${step}${payload}`);
  } catch {
    // Debug instrumentation must never affect the flow it is measuring.
  }
};
