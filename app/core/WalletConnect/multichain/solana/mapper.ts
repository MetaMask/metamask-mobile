import {
  type CaipAccountId,
  type CaipChainId,
  parseCaipAccountId,
} from '@metamask/utils';
import {
  getSignatureFromTransaction,
  getTransactionDecoder,
} from '@solana/transactions';
import { base58 } from 'ethers/lib/utils';
import type { RpcRequest } from '../types';
import type { SolanaSnapSpec, SolanaWalletConnectSpec } from './types';

/**
 * Map connected CAIP-10 account ids to the WalletConnect Solana account
 * response shape. Account methods are handled locally by the adapter because
 * they do not need Snap routing.
 */
export function mapAccountRequest({
  connectedAddresses,
}: {
  connectedAddresses: CaipAccountId[];
}): SolanaWalletConnectSpec['solana_getAccounts']['response'] {
  return connectedAddresses
    .map((accountId) => {
      const { address } = parseCaipAccountId(accountId);
      return address;
    })
    .map((pubkey) => ({ pubkey }));
}

/**
 * Convert WalletConnect sign message params into the canonical Solana Snap
 * request. WalletConnect sends the message as base58 bytes; the snap expects
 * base64.
 */
export function mapSignMessageRequest({
  params,
}: {
  params: SolanaWalletConnectSpec['solana_signMessage']['params'];
}): RpcRequest<SolanaSnapSpec, 'signMessage'> {
  return {
    method: 'signMessage',
    params: {
      account: { address: params.pubkey },
      message: Buffer.from(base58.decode(params.message)).toString('base64'),
    },
  };
}

/**
 * Forward the Solana Snap message signature in the WalletConnect response
 * shape.
 */
export function mapSignMessageResponse(
  result: SolanaSnapSpec['signMessage']['response'],
): SolanaWalletConnectSpec['solana_signMessage']['response'] {
  return {
    signature: result.signature,
  };
}

/**
 * Convert WalletConnect transaction params into the canonical Solana Snap
 * transaction request. The signer is resolved from the first connected CAIP
 * account, matching the WalletConnect session account selected by Mobile.
 */
export function mapSignTransactionRequest({
  params,
  scope,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signTransaction']['params'];
  scope: CaipChainId;
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signTransaction'> {
  const { address } = parseCaipAccountId(connectedAddresses[0]);

  return {
    method: 'signTransaction',
    params: {
      account: { address },
      transaction: params.transaction,
      scope,
    },
  };
}

/**
 * Convert the Solana Snap signed transaction response into WalletConnect's
 * `solana_signTransaction` response, which includes both the full signed
 * transaction and the extracted fee-payer signature.
 */
export function mapSignTransactionResponse(
  result: SolanaSnapSpec['signTransaction']['response'],
): SolanaWalletConnectSpec['solana_signTransaction']['response'] {
  const { signedTransaction } = result;

  return {
    signature: extractSignatureFromSignedTransaction(signedTransaction),
    transaction: signedTransaction,
  };
}

/**
 * Convert WalletConnect sign-and-send params into the canonical Solana Snap
 * transaction request. WalletConnect names send options `sendOptions`; the
 * Solana Snap keyring API expects them under `options`.
 */
export function mapSignAndSendTransactionRequest({
  params,
  scope,
  connectedAddresses,
}: {
  params: SolanaWalletConnectSpec['solana_signAndSendTransaction']['params'];
  scope: CaipChainId;
  connectedAddresses: CaipAccountId[];
}): RpcRequest<SolanaSnapSpec, 'signAndSendTransaction'> {
  const { address } = parseCaipAccountId(connectedAddresses[0]);

  return {
    method: 'signAndSendTransaction',
    params: {
      account: { address },
      transaction: params.transaction,
      scope,
      ...(params.sendOptions ? { options: params.sendOptions } : {}),
    },
  };
}

/**
 * Forward the Solana Snap transaction signature in the WalletConnect
 * `solana_signAndSendTransaction` response shape.
 */
export function mapSignAndSendTransactionResponse(
  result: SolanaSnapSpec['signAndSendTransaction']['response'],
): SolanaWalletConnectSpec['solana_signAndSendTransaction']['response'] {
  return {
    signature: result.signature,
  };
}

/**
 * Extract the fee-payer signature (base58) from a base64-encoded signed
 * Solana transaction. The WalletConnect Solana spec requires the `signature`
 * field for `solana_signTransaction`, while the snap returns the full signed
 * transaction.
 */
function extractSignatureFromSignedTransaction(
  signedTransactionBase64: string,
): string {
  const bytes = new Uint8Array(Buffer.from(signedTransactionBase64, 'base64'));
  const transaction = getTransactionDecoder().decode(bytes);
  return getSignatureFromTransaction(transaction);
}
