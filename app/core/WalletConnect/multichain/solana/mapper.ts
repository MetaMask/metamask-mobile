import {
  parseCaipAccountId,
  type CaipAccountId,
  type CaipChainId,
} from '@metamask/utils';
import type { Address } from '@solana/addresses';
import { getTransactionDecoder } from '@solana/transactions';
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
  scope,
}: {
  params: SolanaWalletConnectSpec['solana_signTransaction']['params'];
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
}): RpcRequest<SolanaSnapSpec, 'signTransaction'> {
  const { pubkey, transaction } = params;
  const address = resolveSignerAddress({ pubkey, connectedAddresses });

  return {
    method: 'signTransaction',
    params: { account: { address }, transaction, scope },
  };
}

/**
 * The snap only returns the signed transaction; WalletConnect also requires
 * the signer's base58 signature, which older clients rely on.
 */
export function mapSignTransactionResponse({
  result,
  signerAddress,
}: {
  result: SolanaSnapSpec['signTransaction']['response'];
  signerAddress: string;
}): SolanaWalletConnectSpec['solana_signTransaction']['response'] {
  const transaction = extractSignedTransaction(result);
  const { signatures } = getTransactionDecoder().decode(
    Buffer.from(transaction, 'base64'),
  );
  const signature = signatures[signerAddress as Address];
  if (!signature) {
    throw new Error('Solana snap did not sign the transaction for the signer');
  }

  return { signature: base58.encode(signature), transaction };
}

/** Map `solana_signAndSendTransaction` onto the snap method of the same name. */
export function mapSignAndSendTransactionRequest({
  params,
  connectedAddresses,
  scope,
}: {
  params: SolanaWalletConnectSpec['solana_signAndSendTransaction']['params'];
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
}): RpcRequest<SolanaSnapSpec, 'signAndSendTransaction'> {
  const { pubkey, transaction, sendOptions } = params;
  const address = resolveSignerAddress({ pubkey, connectedAddresses });

  return {
    method: 'signAndSendTransaction',
    params: {
      account: { address },
      transaction,
      scope,
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
  if (typeof result.signedTransaction === 'string') {
    return result.signedTransaction;
  }

  throw new Error('Solana snap did not return a signed transaction');
}
