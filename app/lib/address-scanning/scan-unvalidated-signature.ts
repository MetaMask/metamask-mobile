import type { PhishingController } from '@metamask/phishing-controller';
import { isBlockaidPreferenceEnabled } from '../../util/blockaid';
import { parseTypedDataMessage, scanAddress } from './address-scan-util';
import { extractSignatureAddresses } from './extract-signature-addresses';

const METHOD_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3';
const METHOD_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4';

/**
 * Scan the address fields of a typed-data signature request.
 *
 * @param options
 * @param options.request - The signature JSON-RPC request.
 * @param options.request.method - The JSON-RPC method.
 * @param options.request.params - The JSON-RPC params, `[signer, typedData]`.
 * @param options.chainId - The chain the signature is scoped to.
 * @param options.phishingController - Controller used to scan and cache results.
 */
export function scanUnvalidatedSignatureAddresses({
  request,
  chainId,
  phishingController,
}: {
  request: { method: string; params?: unknown };
  chainId: string;
  phishingController: PhishingController;
}): void {
  if (
    request.method !== METHOD_SIGN_TYPED_DATA_V3 &&
    request.method !== METHOD_SIGN_TYPED_DATA_V4
  ) {
    return;
  }

  // Skip when the user has disabled security alerts.
  if (!isBlockaidPreferenceEnabled()) {
    return;
  }

  const { params } = request;
  if (!Array.isArray(params) || params[1] === undefined || params[1] === null) {
    return;
  }

  const typedDataMessage = parseTypedDataMessage(
    typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1]),
  );
  if (!typedDataMessage) {
    return;
  }

  const signerAddress = typeof params[0] === 'string' ? params[0] : undefined;

  const { addresses } = extractSignatureAddresses(typedDataMessage, {
    exclude: signerAddress ? [signerAddress] : [],
  });

  for (const address of addresses) {
    scanAddress(phishingController, chainId, address);
  }
}
