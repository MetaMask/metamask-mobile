import type { RpcRequest } from '../types';
import type { StellarSnapSpec, StellarWalletConnectSpec } from './types';

/**
 * Convert WalletConnect `stellar_signXDR` params into the canonical Stellar
 * Snap `signTransaction` request. The signer account and scope are resolved
 * by the routing service, so only the transaction XDR travels in the params.
 */
export function mapSignTransactionRequest({
  params,
}: {
  params: StellarWalletConnectSpec['stellar_signXDR']['params'];
}): RpcRequest<StellarSnapSpec, 'signTransaction'> {
  return {
    method: 'signTransaction',
    params: {
      xdr: params.xdr,
    },
  };
}

/**
 * Forward the Stellar Snap signed transaction XDR in the WalletConnect
 * `stellar_signXDR` response shape.
 */
export function mapSignTransactionResponse(
  result: StellarSnapSpec['signTransaction']['response'],
): StellarWalletConnectSpec['stellar_signXDR']['response'] {
  return {
    signedXDR: result.signedTxXdr,
  };
}
