import {
  extractSignatureAddresses,
  MAX_SIGNATURE_ADDRESSES_CEILING,
  type PhishingController,
} from '@metamask/phishing-controller';
import { isBlockaidPreferenceEnabled } from '../../util/blockaid';
import Logger from '../../util/Logger';

const METHOD_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3';
const METHOD_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4';

interface ParsedTypedDataMessage {
  domain?: Record<string, unknown>;
  message?: Record<string, unknown>;
  primaryType?: string;
  types?: Record<string, unknown>;
}

/**
 * Lightweight EIP-712 parse for address extraction.
 * Kept local so this module does not import the confirmations graph
 * (which breaks under incomplete @metamask/transaction-controller mocks).
 *
 * @param data - Typed-data string or object from eth_signTypedData params.
 * @returns Parsed message, or undefined when parsing fails.
 */
function parseTypedDataMessage(
  data: unknown,
): ParsedTypedDataMessage | undefined {
  try {
    const parsed =
      typeof data === 'string'
        ? (JSON.parse(data) as ParsedTypedDataMessage)
        : (data as ParsedTypedDataMessage);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed;
  } catch (error) {
    Logger.log(
      '[scanUnvalidatedSignatureAddresses] Failed to parse typed data:',
      error,
    );
    return undefined;
  }
}

/**
 * Scan a single address via the phishing controller.
 *
 * @param phishingController - Controller providing scanAddress.
 * @param chainId - Hex chain ID of the request.
 * @param address - Address to scan.
 */
async function scanAddress(
  phishingController: PhishingController,
  chainId: string,
  address: string,
): Promise<void> {
  try {
    await phishingController.scanAddress(chainId, address);
  } catch (error) {
    Logger.log(
      `[scanUnvalidatedSignatureAddresses] Failed to scan address ${address}:`,
      error,
    );
  }
}

/**
 * Scan the address fields of a typed-data signature request.
 *
 * @param options - Request, chain, and phishing controller used to scan.
 * @param options.request - JSON-RPC signature request.
 * @param options.request.method - RPC method name.
 * @param options.request.params - RPC params (`from`, typed data).
 * @param options.chainId - Chain ID of the request.
 * @param options.phishingController - Controller used to scan extracted addresses.
 */
export function scanUnvalidatedSignatureAddresses(options: {
  request: { method: string; params?: unknown };
  chainId: string;
  phishingController: PhishingController;
}): void {
  const { request, chainId, phishingController } = options;
  if (
    request.method !== METHOD_SIGN_TYPED_DATA_V3 &&
    request.method !== METHOD_SIGN_TYPED_DATA_V4
  ) {
    return;
  }

  if (!isBlockaidPreferenceEnabled()) {
    return;
  }

  const { params } = request;
  if (!Array.isArray(params) || params[1] === undefined || params[1] === null) {
    return;
  }

  const typedDataMessage = parseTypedDataMessage(params[1]);
  if (!typedDataMessage) {
    return;
  }

  const signerAddress = typeof params[0] === 'string' ? params[0] : undefined;

  const { addresses } = extractSignatureAddresses(typedDataMessage, {
    exclude: signerAddress ? [signerAddress] : [],
    maxAddresses: MAX_SIGNATURE_ADDRESSES_CEILING,
  });

  for (const address of addresses) {
    scanAddress(phishingController, chainId, address);
  }
}
