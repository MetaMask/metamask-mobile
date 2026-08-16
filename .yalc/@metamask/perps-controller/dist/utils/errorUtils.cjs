"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHyperLiquidMultiSigRequiredError = exports.isHyperLiquidUserNotFoundError = exports.ensureError = exports.isKeyringLockedError = exports.isAbortError = void 0;
/**
 * Utility functions for error handling across Perps controller code.
 * Includes generic error helpers and Perps error classification helpers.
 */
const utils_1 = require("@metamask/utils");
const perpsErrorCodes_js_1 = require("../perpsErrorCodes.cjs");
/**
 * Detects expected cancellation/abort errors that should not be reported to Sentry.
 * These occur during normal navigation or view teardown when in-flight fetch requests
 * are cancelled via AbortController.
 *
 * @param error - The error to check.
 * @returns True if the error is an expected abort/cancellation.
 */
function isAbortError(error) {
    if (error instanceof Error) {
        return (error.name === 'AbortError' ||
            error.message.includes('signal is aborted') ||
            error.message.includes('The operation was aborted'));
    }
    return false;
}
exports.isAbortError = isAbortError;
/**
 * Detects keyring-locked errors, including SDK-wrapped errors that preserve the
 * original error in `cause`.
 *
 * @param error - The error to check.
 * @returns True if any error in the cause chain is KEYRING_LOCKED.
 */
function isKeyringLockedError(error) {
    let current = error;
    const seen = new Set();
    while (current instanceof Error && !seen.has(current)) {
        seen.add(current);
        if (current.message === perpsErrorCodes_js_1.PERPS_ERROR_CODES.KEYRING_LOCKED) {
            return true;
        }
        current = current.cause;
    }
    return false;
}
exports.isKeyringLockedError = isKeyringLockedError;
/**
 * Ensures we have a proper Error object for logging.
 * Converts unknown/string errors to proper Error instances.
 * Handles undefined/null specially for better Sentry context.
 *
 * @param error - The caught error (could be Error, string, or unknown)
 * @param context - Optional context string to help identify the source of the error
 * @returns A proper Error instance
 */
function ensureError(error, context) {
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
    return new Error(typeof error === 'object' && error !== null && (0, utils_1.hasProperty)(error, 'message')
        ? String(error.message)
        : 'Unknown error');
}
exports.ensureError = ensureError;
/**
 * Hyperliquid rejects user-scoped exchange writes (`agentSetAbstraction`,
 * `userSetAbstraction`, `setReferrer`, ...) with this exact message when the
 * wallet has never funded a Hyperliquid account. It is a benign pre-account
 * state, not an error we should forward to Sentry.
 *
 * @param error - The caught error.
 * @returns True if the error matches the Hyperliquid "user not on chain yet" rejection.
 */
function isHyperLiquidUserNotFoundError(error) {
    const lower = ensureError(error).message.toLowerCase();
    return (lower.includes('user or api wallet') && lower.includes('does not exist'));
}
exports.isHyperLiquidUserNotFoundError = isHyperLiquidUserNotFoundError;
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
function isHyperLiquidMultiSigRequiredError(error) {
    const lower = ensureError(error).message.toLowerCase();
    return (lower.includes('multi-sig required') || lower.includes('multisig required'));
}
exports.isHyperLiquidMultiSigRequiredError = isHyperLiquidMultiSigRequiredError;
//# sourceMappingURL=errorUtils.cjs.map