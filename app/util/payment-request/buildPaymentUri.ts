import { build } from 'eth-url-parser';
import type { BuildPaymentUriParams, PaymentMetadata } from './types';
import { PAYMENT_METADATA_KEYS } from './types';

/**
 * Serialize non-empty metadata entries as `key=encodeURIComponent(value)`
 * joined by `&`. Returns an empty string when nothing is serializable.
 */
function serializeMetadata(metadata: PaymentMetadata | undefined): string {
  if (!metadata) {
    return '';
  }
  return PAYMENT_METADATA_KEYS
    .filter((key) => {
      const value = metadata[key];
      return typeof value === 'string' && value.length > 0;
    })
    .map((key) => `${key}=${encodeURIComponent(metadata[key] as string)}`)
    .join('&');
}

/**
 * Build an EIP-681 payment URI from merchant-supplied parameters.
 *
 * For native assets:
 *   ethereum:<merchant>@<chainId>?value=<wei>
 * For ERC-20:
 *   ethereum:<token>@<chainId>/transfer?address=<merchant>&uint256=<atomicAmount>
 *
 * Optional merchant metadata (name, memo, invoice id, issuedAt) is appended as
 * extra query parameters. Wallets that follow EIP-681 strictly will ignore
 * unknown parameters.
 *
 * @param params - Payment request parameters.
 * @returns An EIP-681 URI string.
 */
export function buildPaymentUri(params: BuildPaymentUriParams): string {
  const { chainId, merchantAddress, amount, asset, metadata } = params;

  let baseUri: string;

  const chainIdLiteral = chainId as `${number}`;

  if (asset.type === 'native') {
    baseUri = build({
      target_address: merchantAddress,
      chain_id: chainIdLiteral,
      parameters: { value: amount },
    });
  } else if (asset.type === 'erc20') {
    baseUri = build({
      target_address: asset.address,
      chain_id: chainIdLiteral,
      function_name: 'transfer',
      parameters: {
        address: merchantAddress,
        uint256: amount,
      },
    });
  } else {
    throw new Error(
      `Unsupported asset type: ${(asset as { type: string }).type}`,
    );
  }

  const metadataQuery = serializeMetadata(metadata);
  if (!metadataQuery) {
    return baseUri;
  }

  const separator = baseUri.includes('?') ? '&' : '?';
  return `${baseUri}${separator}${metadataQuery}`;
}
