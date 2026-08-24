import { osLog } from '../../osLog';

/**
 * Tag for all startup push-notification diagnostic lines written to the device
 * OS log. With the device connected to a Mac over USB, filter Console.app (or
 * `log stream`) for `MMPushStartup` to see every gate/decision in the startup
 * notification flow, including in prod (exp/TestFlight) builds.
 */
const PUSH_STARTUP_LOG_TAG = 'MMPushStartup';

/**
 * Diagnostic log for the startup push-notification flow (pre-prompt gating,
 * OS permission requests, enable-on-startup effects). Persisted on-device and
 * readable via Console.app even in production builds. Never log secrets.
 */
export const pushStartupLog = (
  message: string,
  context?: Record<string, unknown>,
): void => osLog(PUSH_STARTUP_LOG_TAG, message, context);
