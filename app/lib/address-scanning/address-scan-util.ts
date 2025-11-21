import { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import { parseStandardTokenTransactionData } from '../../components/Views/confirmations/utils/transaction';
import { APPROVAL_TYPES } from '../../components/Views/confirmations/constants/approvals';
import Logger from '../../util/Logger';

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
 * RPC request validation utilities
 */

/**
 * Basic JSON-RPC request interface for validation
 */
export interface BasicJsonRpcRequest extends JsonRpcRequest {
  params?: Json[];
}

/**
 * Check if request has valid transaction parameters
 */
export function hasValidTransactionParams(
  req: BasicJsonRpcRequest,
): req is BasicJsonRpcRequest & { params: [object, ...Json[]] } {
  return (
    Array.isArray(req.params) &&
    req.params.length > 0 &&
    typeof req.params[0] === 'object' &&
    req.params[0] !== null
  );
}

/**
 * Check if request has valid typed data parameters
 */
export function hasValidTypedDataParams(
  req: BasicJsonRpcRequest,
): req is BasicJsonRpcRequest & { params: [Json, Json, ...Json[]] } {
  return Array.isArray(req.params) && req.params.length >= 2;
}

/**
 * Check if request is eth_sendTransaction
 */
export function isEthSendTransaction(req: BasicJsonRpcRequest): boolean {
  return req.method === 'eth_sendTransaction';
}

/**
 * Check if request is any eth_signTypedData variant
 */
export function isEthSignTypedData(req: BasicJsonRpcRequest): boolean {
  return [
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ].includes(req.method);
}

/**
 * Security scanning utilities
 */

/**
 * Scan an address using the phishing controller
 *
 * @param phishingController - The phishing controller
 * @param chainId - The chainId
 * @param address - The address to scan
 */
export async function scanAddress(
  phishingController: PhishingController,
  chainId: string,
  address: string,
): Promise<void> {
  try {
    await phishingController.scanAddress(chainId, address);
    Logger.log(
      `[scanAddress] Cache: ${JSON.stringify(phishingController.state.addressScanCache)}`,
    );
  } catch (error) {
    Logger.log(`[scanAddress] Failed to scan address ${address}:`, error);
  }
}

/**
 * Scan a URL/origin using the phishing controller
 *
 * @param phishingController - The phishing controller
 * @param origin - The origin URL to scan
 */
export async function scanUrl(
  phishingController: PhishingController,
  origin: string,
): Promise<void> {
  try {
    await phishingController.scanUrl(origin);
    // log the cache
    Logger.log(
      `[scanUrl] Cache: ${JSON.stringify(phishingController.state.urlScanCache)}`,
    );
  } catch (error) {
    Logger.log(`[scanUrl] Failed to scan URL ${origin}:`, error);
  }
}
