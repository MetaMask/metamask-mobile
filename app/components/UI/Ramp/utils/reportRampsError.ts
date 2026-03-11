import Logger from '../../../../util/Logger';
import { parseUserFacingError } from './parseUserFacingError';

export interface ReportRampsErrorContext {
  provider?: string;
  message?: string;
}

/**
 * Logs a ramps error and returns a user-facing message. Use with setNativeFlowError
 * in catch blocks.
 *
 * @param error - The caught error.
 * @param context - Optional context for logging (e.g. provider, message).
 * @param fallback - Fallback string when no message can be extracted.
 * @returns User-facing error message to pass to setNativeFlowError.
 */
export function reportRampsError(
  error: unknown,
  context: ReportRampsErrorContext | undefined,
  fallback: string,
): string {
  Logger.error(error as Error, context ?? {});
  return parseUserFacingError(error, fallback);
}
