import { captureException } from '@sentry/react-native';
import { ExclusiveEventHintOrCaptureContext } from '@sentry/core/build/types/utils/prepareEvent';

/**
 * Capture an error exception in Sentry
 * @param exception - The error exception to capture
 * @param hint - The hint to capture the exception with
 * @returns The event ID of the captured exception
 */
export function captureErrorException(
  exception: Error,
  hint?: ExclusiveEventHintOrCaptureContext,
) {
  return captureException(exception, hint);
}
