/**
 * Utility functions for error handling across Perps controller code.
 * Includes generic error helpers and Perps error classification helpers.
 */
import { hasProperty } from '@metamask/utils';

import { PERPS_ERROR_CODES } from '../perpsErrorCodes';

/**
 * Detects expected cancellation/abort errors that should not be reported to Sentry.
 * These occur during normal navigation or view teardown when in-flight fetch requests
 * are cancelled via AbortController.
 *
 * @param error - The error to check.
 * @returns True if the error is an expected abort/cancellation.
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('signal is aborted') ||
      error.message.includes('The operation was aborted')
    );
  }
  return false;
}

/**
 * Detects keyring-locked errors, including SDK-wrapped errors that preserve the
 * original error in `cause`.
 *
 * @param error - The error to check.
 * @returns True if any error in the cause chain is KEYRING_LOCKED.
 */
export function isKeyringLockedError(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);

    if (current.message === PERPS_ERROR_CODES.KEYRING_LOCKED) {
      return true;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

/**
 * Ensures we have a proper Error object for logging.
 * Converts unknown/string errors to proper Error instances.
 * Handles undefined/null specially for better Sentry context.
 *
 * @param error - The caught error (could be Error, string, or unknown)
 * @param context - Optional context string to help identify the source of the error
 * @returns A proper Error instance
 */
export function ensureError(error: unknown, context?: string): Error {
  if (error instanceof Error) {
    return error;
  }
  // Handle undefined/null specifically for better error context
  // e.g. Hyperliquid SDK may reject with undefined when AbortSignal.reason is not set
  if (error === undefined || error === null) {
    const baseMessage = 'Unknown error (no details provided)';
    return new Error(context ? `${baseMessage} [${context}]` : baseMessage);
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error(
    typeof error === 'object' && error !== null && hasProperty(error, 'message')
      ? String((error as { message: unknown }).message)
      : 'Unknown error',
  );
}

/**
 * Hyperliquid rejects user-scoped exchange writes (`agentSetAbstraction`,
 * `userSetAbstraction`, `setReferrer`, ...) with this exact message when the
 * wallet has never funded a Hyperliquid account. It is a benign pre-account
 * state, not an error we should forward to Sentry.
 *
 * @param error - The caught error.
 * @returns True if the error matches the Hyperliquid "user not on chain yet" rejection.
 */
export function isHyperLiquidUserNotFoundError(error: unknown): boolean {
  const lower = ensureError(error).message.toLowerCase();
  return (
    lower.includes('user or api wallet') && lower.includes('does not exist')
  );
}
