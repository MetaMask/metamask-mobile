import { CaipAccountId } from "@metamask/utils";
import type { PerpsLogger } from "../types/index.cjs";
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
export declare const formatAccountToCaipAccountId: (address: string, chainId: string, logger?: PerpsLogger) => CaipAccountId | null;
/**
 * Type guard to check if a value is a valid CAIP account ID
 *
 * @param value - Value to check
 * @returns True if value is a valid CAIP account ID
 */
export declare const isCaipAccountId: (value: unknown) => value is `${string}:${string}:${string}`;
/**
 * Helper to handle rewards-related errors consistently
 *
 * @param error - The error that occurred
 * @param logger - Optional logger for error reporting
 * @param context - Optional context information
 * @returns A user-friendly error message
 */
export declare const handleRewardsError: (error: unknown, logger?: PerpsLogger, context?: Record<string, unknown>) => string;
//# sourceMappingURL=rewardsUtils.d.cts.map