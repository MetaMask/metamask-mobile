import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import { base58 } from 'ethers/lib/utils';
import type { RpcRequest } from '../types';
import type { SolanaSnapSpec, SolanaWalletConnectSpec } from './types';

/**
 * Resolve the signer address from WalletConnect params or the session accounts.
 */
export function resolveSignerAddress({
  pubkey,
  connectedAddresses,
}: {
  pubkey?: string;
  connectedAddresses: CaipAccountId[];
}): string {
  if (typeof pubkey === 'string' && pubkey.length > 0) {
    return pubkey;
  }

  const [firstAccount] = connectedAddresses;
  if (!firstAccount) {
    throw new Error('No Solana account available to sign this request');
  }

  return parseCaipAccountId(firstAccount).address;
}

/**
 * WalletConnect `solana_signMessage` encodes the payload as base58. The Solana
 * snap / CAIP-25 `signMessage` method expects base64.
 */
export function walletConnectMessageToSnapBase64(message: string): string {
  return Buffer.from(base58.decode(message)).toString('base64');
}

/**
 * Convert WalletConnect message signing params into the canonical Solana Snap
 * request.
 */
export function mapSignMessageRequest({
  params,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signMessage']['params'];
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signMessage'> {
  return {
    method: 'signMessage',
    params: {
      account: {
        address: resolveSignerAddress({
          pubkey: params.pubkey,
          connectedAddresses,
        }),
      },
      message: walletConnectMessageToSnapBase64(params.message),
    },
  };
}

/**
 * Forward the Solana Snap message signature in the WalletConnect
 * `solana_signMessage` response shape.
 */
export function mapSignMessageResponse(
  result: SolanaSnapSpec['signMessage']['response'],
): SolanaWalletConnectSpec['solana_signMessage']['response'] {
  return { signature: result.signature };
}

/**
 * Convert WalletConnect transaction signing params into the canonical Solana
 * Snap request. WalletConnect and the snap both use a base64-serialized
 * transaction.
 */
export function mapSignTransactionRequest({
  params,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signTransaction']['params'];
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signTransaction'> {
  return {
    method: 'signTransaction',
    params: {
      account: {
        address: resolveSignerAddress({
          pubkey: params.pubkey,
          connectedAddresses,
        }),
      },
      transaction: params.transaction,
    },
  };
}

/**
 * Convert the Solana Snap transaction result into the WalletConnect
 * `solana_signTransaction` response. Prefer the signed transaction when the
 * snap returns it so versioned transactions stay intact.
 */
export function mapSignTransactionResponse(
  result: SolanaSnapSpec['signTransaction']['response'],
): SolanaWalletConnectSpec['solana_signTransaction']['response'] {
  const response: SolanaWalletConnectSpec['solana_signTransaction']['response'] =
    {};

  if (typeof result.transaction === 'string') {
    response.transaction = result.transaction;
  }
  if (typeof result.signature === 'string') {
    response.signature = result.signature;
  }

  return response;
}

/**
 * Convert WalletConnect sign-and-send params into the canonical Solana Snap
 * request. `sendOptions` (including `preflightCommitment`) is forwarded so
 * dapps can avoid the Solana RPC default of `finalized`, which commonly
 * delays confirmation past 10 seconds.
 */
export function mapSignAndSendTransactionRequest({
  params,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signAndSendTransaction']['params'];
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signAndSendTransaction'> {
  const request: RpcRequest<SolanaSnapSpec, 'signAndSendTransaction'> = {
    method: 'signAndSendTransaction',
    params: {
      account: {
        address: resolveSignerAddress({
          pubkey: params.pubkey,
          connectedAddresses,
        }),
      },
      transaction: params.transaction,
      // Solana JSON-RPC sendTransaction defaults preflight to `finalized`,
      // which commonly stalls dapps (e.g. Jupiter) past 10s. Prefer `confirmed`
      // unless the dapp set sendOptions.
      options: {
        preflightCommitment: 'confirmed',
        ...params.sendOptions,
      },
    },
  };

  return request;
}

/**
 * Forward the Solana Snap send result as a WalletConnect signature (base58 tx
 * id).
 */
export function mapSignAndSendTransactionResponse(
  result: SolanaSnapSpec['signAndSendTransaction']['response'],
): SolanaWalletConnectSpec['solana_signAndSendTransaction']['response'] {
  return { signature: result.signature };
}

/**
 * Map session accounts to WalletConnect `solana_getAccounts` /
 * `solana_requestAccounts` results.
 */
export function mapGetAccountsResponse(
  connectedAddresses: CaipAccountId[],
): SolanaWalletConnectSpec['solana_getAccounts']['response'] {
  return connectedAddresses.map((accountId) => ({
    pubkey: parseCaipAccountId(accountId).address,
  }));
}

/**
 * Extract the signed base64 transaction from a snap `signTransaction` result.
 */
export function extractSignedTransaction(
  result: SolanaSnapSpec['signTransaction']['response'],
): string {
  if (typeof result.transaction === 'string') {
    return result.transaction;
  }

  throw new Error(
    'Solana snap did not return a signed transaction for solana_signAllTransactions',
  );
}
