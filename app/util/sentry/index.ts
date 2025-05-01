import { captureException } from '@sentry/react-native';
import { ExclusiveEventHintOrCaptureContext } from '@sentry/core/build/types/utils/prepareEvent';

/**
 * Capture an error exception in Sentry
 * @param exception - The error exception to capture
 * @param hint - The hint to capture the exception with
 * @returns The event ID of the captured exception
 *
 * Report Error for better stack tracing - https://docs.sentry.io/platforms/javascript/usage/#capturing-errors
 */
export function captureErrorException(
  exception: Error,
  hint?: ExclusiveEventHintOrCaptureContext,
) {
  return captureException(exception, hint);
}
