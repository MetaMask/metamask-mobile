/**
 * Detects expected cancellation/abort errors that should not be reported to Sentry.
 * These occur during normal navigation or view teardown when in-flight fetch requests
 * are cancelled via AbortController.
 *
 * @param error - The error to check.
 * @returns True if the error is an expected abort/cancellation.
 */
export declare function isAbortError(error: unknown): boolean;
/**
 * Detects keyring-locked errors, including SDK-wrapped errors that preserve the
 * original error in `cause`.
 *
 * @param error - The error to check.
 * @returns True if any error in the cause chain is KEYRING_LOCKED.
 */
export declare function isKeyringLockedError(error: unknown): boolean;
/**
 * Ensures we have a proper Error object for logging.
 * Converts unknown/string errors to proper Error instances.
 * Handles undefined/null specially for better Sentry context.
 *
 * @param error - The caught error (could be Error, string, or unknown)
 * @param context - Optional context string to help identify the source of the error
 * @returns A proper Error instance
 */
export declare function ensureError(error: unknown, context?: string): Error;
/**
 * Hyperliquid rejects user-scoped exchange writes (`agentSetAbstraction`,
 * `userSetAbstraction`, `setReferrer`, ...) with this exact message when the
 * wallet has never funded a Hyperliquid account. It is a benign pre-account
 * state, not an error we should forward to Sentry.
 *
 * @param error - The caught error.
 * @returns True if the error matches the Hyperliquid "user not on chain yet" rejection.
 */
export declare function isHyperLiquidUserNotFoundError(error: unknown): boolean;
/**
 * Hyperliquid rejects every single-signer exchange write for an account that
 * has been converted to multi-sig (`ApiRequestError: Multi-sig required`).
 * MetaMask signs Perps actions with a single agent/user wallet, so this is a
 * permanent account-shape condition rather than a failure we should retry or
 * forward to Sentry. Only the hyphenated spelling has been observed from the
 * venue; the unhyphenated variant is matched defensively.
 *
 * @param error - The caught error.
 * @returns True if the error indicates multi-sig signing is required.
 */
export declare function isHyperLiquidMultiSigRequiredError(error: unknown): boolean;
//# sourceMappingURL=errorUtils.d.cts.map