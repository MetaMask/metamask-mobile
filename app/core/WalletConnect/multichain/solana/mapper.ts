import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import { base58 } from 'ethers/lib/utils';
import type { RpcRequest } from '../types';
import type { SolanaSnapSpec, SolanaWalletConnectSpec } from './types';

/** Signer from the request pubkey, else the first session account. */
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

/** WalletConnect encodes message payloads as base58; the snap wants base64. */
export function walletConnectMessageToSnapBase64(message: string): string {
  return Buffer.from(base58.decode(message)).toString('base64');
}

/** Map `solana_signMessage` onto the snap `signMessage` method. */
export function mapSignMessageRequest({
  params,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signMessage']['params'];
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signMessage'> {
  const { pubkey, message } = params;
  const address = resolveSignerAddress({ pubkey, connectedAddresses });

  return {
    method: 'signMessage',
    params: {
      account: { address },
      message: walletConnectMessageToSnapBase64(message),
    },
  };
}

/**
 * Map `solana_signTransaction` onto the snap `signTransaction` method. Both
 * sides use a base64-serialized transaction.
 */
export function mapSignTransactionRequest({
  params,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signTransaction']['params'];
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signTransaction'> {
  const { pubkey, transaction } = params;
  const address = resolveSignerAddress({ pubkey, connectedAddresses });

  return {
    method: 'signTransaction',
    params: { account: { address }, transaction },
  };
}

/**
 * Prefer the signed transaction when the snap returns it so versioned
 * transactions reach the dapp intact.
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

/** Map `solana_signAndSendTransaction` onto the snap method of the same name. */
export function mapSignAndSendTransactionRequest({
  params,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signAndSendTransaction']['params'];
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signAndSendTransaction'> {
  const { pubkey, transaction, sendOptions } = params;
  const address = resolveSignerAddress({ pubkey, connectedAddresses });

  return {
    method: 'signAndSendTransaction',
    params: {
      account: { address },
      transaction,
      // Solana JSON-RPC sendTransaction defaults preflight to `finalized`,
      // which commonly stalls dapps (e.g. Jupiter) past 10s. Prefer
      // `confirmed` unless the dapp set sendOptions.
      options: { preflightCommitment: 'confirmed', ...sendOptions },
    },
  };
}

/**
 * `signMessage` and `signAndSendTransaction` share the `{ signature }` shape on
 * both sides. Rebuild it so snap-internal fields never reach the dapp.
 */
export function mapSignatureResponse(result: { signature: string }): {
  signature: string;
} {
  return { signature: result.signature };
}

/** Map session accounts onto `solana_getAccounts` / `solana_requestAccounts`. */
export function mapGetAccountsResponse(
  connectedAddresses: CaipAccountId[],
): SolanaWalletConnectSpec['solana_getAccounts']['response'] {
  return connectedAddresses.map((accountId) => ({
    pubkey: parseCaipAccountId(accountId).address,
  }));
}

/** Pull the signed base64 transaction out of a snap `signTransaction` result. */
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
