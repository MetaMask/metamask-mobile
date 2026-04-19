import { parse } from 'eth-url-parser';
import type {
  ParsedPaymentUri,
  PaymentMetadata,
  PaymentMetadataKey,
} from './types';
import { PAYMENT_METADATA_KEYS } from './types';

/**
 * Extract merchant metadata from a raw EIP-681 URI by reading the query
 * string directly. We do this independently of `eth-url-parser` because it
 * strips unknown parameters from its structured output.
 */
function extractMetadataFromQuery(uri: string): PaymentMetadata {
  const queryStart = uri.indexOf('?');
  if (queryStart === -1) {
    return {};
  }
  const query = uri.slice(queryStart + 1);
  const entries = query.split('&');
  const metadata: PaymentMetadata = {};
  const knownKeys = new Set<PaymentMetadataKey>(PAYMENT_METADATA_KEYS);

  for (const entry of entries) {
    const eqIndex = entry.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const rawKey = entry.slice(0, eqIndex);
    const rawValue = entry.slice(eqIndex + 1);
    if (!knownKeys.has(rawKey as PaymentMetadataKey)) {
      continue;
    }
    try {
      metadata[rawKey as PaymentMetadataKey] = decodeURIComponent(rawValue);
    } catch {
      metadata[rawKey as PaymentMetadataKey] = rawValue;
    }
  }

  return metadata;
}

/**
 * Parse an EIP-681 URI plus our optional merchant metadata.
 *
 * @throws Error when the URI is not a valid EIP-681 payment URI.
 */
export function parsePaymentUri(uri: string): ParsedPaymentUri {
  const parsed = parse(uri);

  if (parsed.scheme !== 'ethereum' || !parsed.target_address) {
    throw new Error('Not a valid ethereum: URI');
  }

  const chainId = parsed.chain_id ?? '1';
  const metadata = extractMetadataFromQuery(uri);

  if (parsed.function_name === 'transfer') {
    const recipient = parsed.parameters?.address;
    const amount = parsed.parameters?.uint256;
    if (!recipient || amount === undefined || amount === null) {
      throw new Error('Malformed ERC-20 transfer URI');
    }
    return {
      chainId,
      merchantAddress: recipient,
      amount: String(amount),
      asset: { type: 'erc20', address: parsed.target_address },
      metadata,
    };
  }

  const value = parsed.parameters?.value;
  return {
    chainId,
    merchantAddress: parsed.target_address,
    amount: value === undefined || value === null ? '0' : String(value),
    asset: { type: 'native' },
    metadata,
  };
}

/**
 * Returns true when the URI carries at least one MetaMask merchant metadata
 * query parameter, which is how we distinguish merchant requests from bare
 * EIP-681 payment URIs.
 */
export function isMerchantPaymentUri(uri: string): boolean {
  const metadata = extractMetadataFromQuery(uri);
  return Object.keys(metadata).length > 0;
}
