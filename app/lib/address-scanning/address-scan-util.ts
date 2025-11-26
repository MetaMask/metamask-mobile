import { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import { parseApprovalTransactionData } from '../../components/Views/confirmations/utils/approvals';
import { parseAndNormalizeSignTypedData } from '../../components/Views/confirmations/utils/signature';
import {
  parseStandardTokenTransactionData,
  get4ByteCode,
} from '../../components/Views/confirmations/utils/transaction';
import { PRIMARY_TYPES_PERMIT } from '../../components/Views/confirmations/constants/signatures';
import { APPROVAL_4BYTE_SELECTORS } from '../../components/Views/confirmations/constants/approve';
import Logger from '../../util/Logger';

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
 * Parse typed data message using existing robust utility
 *
 * @param data - The typed data as a string or object
 * @returns Parsed typed data message or undefined if parsing fails
 */
export function parseTypedDataMessage(
  data: string | object,
): ParsedTypedDataMessage | undefined {
  try {
    if (typeof data === 'string') {
      return parseAndNormalizeSignTypedData(data) as ParsedTypedDataMessage;
    }
    return parseAndNormalizeSignTypedData(
      JSON.stringify(data),
    ) as ParsedTypedDataMessage;
  } catch (error) {
    return undefined;
  }
}

/**
 * Extract spender address from approval transaction data using 4-byte selector approach
 *
 * @param data - The transaction data hex string
 * @returns The spender address or undefined if not an approval or parsing fails
 */
export function extractSpenderFromApprovalData(data?: Hex): string | undefined {
  if (!data) {
    return undefined;
  }

  try {
    // First check if it's an approval transaction
    const approvalData = parseApprovalTransactionData(data);
    if (!approvalData) {
      return undefined;
    }

    const fourByteCode = get4ByteCode(data);

    const transactionDescription = parseStandardTokenTransactionData(data);
    const args = transactionDescription?.args;

    if (!args) {
      return undefined;
    }

    let spender: unknown;

    switch (fourByteCode) {
      case APPROVAL_4BYTE_SELECTORS.APPROVE:
        spender = args._spender;
        break;

      case APPROVAL_4BYTE_SELECTORS.ERC20_INCREASE_ALLOWANCE:
      case APPROVAL_4BYTE_SELECTORS.ERC20_DECREASE_ALLOWANCE:
        spender = args._spender;
        break;

      case APPROVAL_4BYTE_SELECTORS.SET_APPROVAL_FOR_ALL:
        spender = args._operator;
        break;

      case APPROVAL_4BYTE_SELECTORS.PERMIT2_APPROVE:
        spender = args.spender;
        break;

      default:
        return undefined;
    }

    return typeof spender === 'string' ? spender : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Extract spender address from ERC-2612 permit signatures
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

  if (
    !PRIMARY_TYPES_PERMIT.includes(
      primaryType as (typeof PRIMARY_TYPES_PERMIT)[number],
    )
  ) {
    return undefined;
  }

  const spender = message.spender;
  if (typeof spender === 'string') {
    return spender;
  }

  return undefined;
}

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
  } catch (error) {
    Logger.log(`[scanUrl] Failed to scan URL ${origin}:`, error);
  }
}

/**
 * Generate a cache key for address scanning
 *
 * @param chainId - The chainId
 * @param address - The address to scan
 * @returns The cache key
 */
export function generateAddressCacheKey(
  chainId: string,
  address: string,
): string {
  return `${chainId.toLowerCase()}:${address.toLowerCase()}`;
}
