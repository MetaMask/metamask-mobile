/**
 * Writes log lines to the device OS log so they can be read on a Mac with the
 * device connected over USB (Console.app, or `log stream`), including in
 * production builds (e.g. TestFlight `exp` builds) where `console.*` is
 * stripped and `Logger` only reports to Sentry.
 *
 * How it works:
 * - babel-plugin-transform-remove-console (babel.config.js `env.production`,
 * active for all Release/TestFlight builds) only removes calls on a bare
 * `console` identifier, so going through `globalThis.console` keeps these
 * calls in the release bundle. Do not "simplify" this to `console.*`.
 * - React Native forwards console output to the platform logger whenever
 * `nativeLoggingHook` is installed — and it is installed unconditionally,
 * in release builds too:
 * - iOS: os_log, subsystem `com.facebook.react.log`, category `javascript`.
 * `error` lines are persisted by the OS log store and shown in
 * Console.app by default; `info` lines only appear while live-streaming
 * with "Include Info Messages" enabled (Action menu).
 * - Android: logcat under the `ReactNativeJS` tag (`adb logcat`).
 *
 * Nothing logged here ever leaves the device. Never log secrets or user data.
 */

export type OsLogLevel = 'info' | 'error';

const safeStringify = (context: Record<string, unknown>): string => {
  try {
    return JSON.stringify(context);
  } catch {
    return '[unserializable context]';
  }
};

/**
 * Appends a tagged line to the device OS log.
 *
 * @param tag Short, greppable tag (e.g. 'MMPushStartup') to filter by in
 * Console.app / `log stream`.
 * @param message Human-readable message. Keep it on one line.
 * @param context Optional structured values, JSON-serialized inline.
 * @param level Defaults to 'error' because os_log persists error lines (and
 * Console.app shows them without extra filters); 'info' lines are only
 * visible in a live stream with info messages enabled.
 */
export const osLog = (
  tag: string,
  message: string,
  context?: Record<string, unknown>,
  level: OsLogLevel = 'error',
): void => {
  // Never emit during unit tests. JEST_WORKER_ID is intentionally left
  // runtime-readable by babel.config.js for guards like this one.
  if (process.env.JEST_WORKER_ID) {
    return;
  }
  try {
    const line = context
      ? `[${tag}] ${message} ${safeStringify(context)}`
      : `[${tag}] ${message}`;
    // Not bare `console.*` on purpose — see file header.
    const deviceConsole = globalThis.console;
    if (level === 'info') {
      deviceConsole?.info(line);
    } else {
      deviceConsole?.error(line);
    }
  } catch {
    // Logging must never break the app.
  }
};
