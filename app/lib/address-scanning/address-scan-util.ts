import { Hex } from '@metamask/utils';
import { parseStandardTokenTransactionData } from '../../components/Views/confirmations/utils/transaction';
import { APPROVAL_TYPES } from '../../components/Views/confirmations/constants/approvals';

/**
 * Known Permit EIP-712 primary types
 * These are used to detect permit-style signatures
 */
export const PRIMARY_TYPES_PERMIT = [
  'Permit',
  'PermitSingle',
  'PermitBatch',
] as const;

/**
 * Parsed typed data message structure
 */
export interface ParsedTypedDataMessage {
  domain?: {
    name?: string;
    version?: string;
    chainId?: number | string;
    verifyingContract?: string;
    salt?: string;
  };
  message?: Record<string, unknown>;
  primaryType?: string;
  types?: Record<string, unknown>;
}

/**
 * Parse typed data message from string or object
 *
 * @param data - The typed data as a string or object
 * @returns Parsed typed data message or undefined if parsing fails
 */
export function parseTypedDataMessage(
  data: string | object,
): ParsedTypedDataMessage | undefined {
  try {
    if (typeof data === 'string') {
      return JSON.parse(data) as ParsedTypedDataMessage;
    }
    return data as ParsedTypedDataMessage;
  } catch (error) {
    console.error('[parseTypedDataMessage] Failed to parse typed data:', error);
    return undefined;
  }
}

/**
 * Extract spender address from approval transaction data
 *
 * @param data - The transaction data hex string
 * @returns The spender address or undefined if not an approval or parsing fails
 */
export function extractSpenderFromApprovalData(data?: Hex): string | undefined {
  if (!data) {
    return undefined;
  }

  try {
    const transactionDescription = parseStandardTokenTransactionData(data);
    const { args, name } = transactionDescription ?? { name: '' };

    // For standard ERC-20 approve, the first argument is the spender
    if (name === APPROVAL_TYPES.approve && args) {
      // Standard approve(address spender, uint256 amount)
      const spender = args[0] || args.spender || args._spender;
      if (typeof spender === 'string') {
        return spender;
      }
    }

    // For increaseAllowance, the first argument is also the spender
    if (name === APPROVAL_TYPES.increaseAllowance && args) {
      // increaseAllowance(address spender, uint256 addedValue)
      const spender = args[0] || args.spender || args._spender;
      if (typeof spender === 'string') {
        return spender;
      }
    }

    // For Permit2, the second argument is the spender
    // approve(address token, address spender, uint160 amount, uint48 expiration)
    if (args?.spender) {
      return args.spender as string;
    }

    return undefined;
  } catch (error) {
    console.error(
      '[extractSpenderFromApprovalData] Failed to extract spender:',
      error,
    );
    return undefined;
  }
}

/**
 * Extract spender address from permit-style typed data message
 *
 * @param typedDataMessage - The parsed typed data message
 * @returns The spender address or undefined if not a permit or spender not found
 */
export function extractSpenderFromPermitMessage(
  typedDataMessage: ParsedTypedDataMessage,
): string | undefined {
  const { primaryType, message } = typedDataMessage;

  if (!primaryType || !message) {
    return undefined;
  }

  // Check if this is a known permit type
  if (
    !PRIMARY_TYPES_PERMIT.includes(
      primaryType as (typeof PRIMARY_TYPES_PERMIT)[number],
    )
  ) {
    return undefined;
  }

  // Extract spender from message
  const spender = message.spender;
  if (typeof spender === 'string') {
    return spender;
  }

  return undefined;
}

/**
 * Check if a string resembles an Ethereum address
 *
 * @param str - The string to check
 * @returns True if the string looks like an Ethereum address
 */
export function resemblesAddress(str?: string): boolean {
  if (!str) {
    return false;
  }
  return /^0x[0-9a-fA-F]{40}$/u.test(str);
}
