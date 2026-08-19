"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRewardsError = exports.isCaipAccountId = exports.formatAccountToCaipAccountId = void 0;
/**
 * Shared rewards utilities for Perps components
 * Handles CAIP account formatting and rewards integration
 *
 * Portable: no mobile-specific imports.
 * Logger is injected as optional parameter for platform-agnostic error reporting.
 */
const controller_utils_1 = require("@metamask/controller-utils");
const utils_1 = require("@metamask/utils");
const errorUtils_js_1 = require("./errorUtils.cjs");
/**
 * Converts a numeric or hex chain ID to a CAIP-2 chain ID string.
 * e.g. '0x1' → 'eip155:1', '42161' → 'eip155:42161'
 *
 * @param chainId - Numeric string or hex string chain ID.
 * @returns CAIP-2 formatted chain ID.
 */
function formatChainIdToCaip(chainId) {
    const decimal = chainId.startsWith('0x')
        ? parseInt(chainId, 16)
        : parseInt(chainId, 10);
    if (isNaN(decimal)) {
        throw new Error(`Invalid chain ID: ${chainId}`);
    }
    return `eip155:${decimal}`;
}
/**
 * Formats an address to CAIP-10 account ID format
 *
 * @param address - The wallet address to format
 * @param chainId - The chain ID (e.g., '1' for mainnet, '42161' for Arbitrum)
 * @param logger - Optional logger for error reporting
 * @returns CAIP-10 formatted account ID or null if formatting fails
 * @example
 * ```typescript
 * const caipId = formatAccountToCaipAccountId('0x123...', '42161');
 * // Returns: 'eip155:42161:0x123...'
 * ```
 */
const formatAccountToCaipAccountId = (address, chainId, logger) => {
    try {
        const caipChainId = formatChainIdToCaip(chainId);
        const { namespace, reference } = (0, utils_1.parseCaipChainId)(caipChainId);
        // Normalize EVM addresses to checksummed format for consistent CAIP IDs
        let normalizedAddress = address;
        if (namespace === 'eip155') {
            normalizedAddress = (0, controller_utils_1.toChecksumHexAddress)(address);
        }
        return (0, utils_1.toCaipAccountId)(namespace, reference, normalizedAddress);
    }
    catch (error) {
        logger?.error((0, errorUtils_js_1.ensureError)(error, 'rewardsUtils.formatAccountToCaipAccountId'), {
            context: {
                name: 'rewardsUtils.formatAccountToCaipAccountId',
                data: { address, chainId },
            },
        });
        return null;
    }
};
exports.formatAccountToCaipAccountId = formatAccountToCaipAccountId;
/**
 * Type guard to check if a value is a valid CAIP account ID
 *
 * @param value - Value to check
 * @returns True if value is a valid CAIP account ID
 */
const isCaipAccountId = (value) => {
    if (typeof value !== 'string') {
        return false;
    }
    // CAIP-10 format: namespace:reference:account_address
    const parts = value.split(':');
    return parts.length >= 3 && parts[0] === 'eip155';
};
exports.isCaipAccountId = isCaipAccountId;
/**
 * Helper to handle rewards-related errors consistently
 *
 * @param error - The error that occurred
 * @param logger - Optional logger for error reporting
 * @param context - Optional context information
 * @returns A user-friendly error message
 */
const handleRewardsError = (error, logger, context) => {
    logger?.error((0, errorUtils_js_1.ensureError)(error, 'rewardsUtils.handleRewardsError'), {
        context: {
            name: 'rewardsUtils.handleRewardsError',
            data: { additionalContext: context },
        },
    });
    return 'Rewards operation failed';
};
exports.handleRewardsError = handleRewardsError;
//# sourceMappingURL=rewardsUtils.cjs.map