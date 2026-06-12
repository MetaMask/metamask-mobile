import { type CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import type { RpcRequest } from '../types';
import type { BitcoinSnapSpec, BitcoinWalletConnectSpec } from './types';

/**
 * Map connected CAIP-10 account ids to the WalletConnect Bitcoin account
 * addresses response. Served locally by the adapter because it does not need
 * Snap routing. `publicKey`, `path`, and `intention` are optional and left
 * unset since they are not derivable from the session account ids.
 */
export function mapAccountAddressesRequest({
  connectedAddresses,
}: {
  connectedAddresses: CaipAccountId[];
}): BitcoinWalletConnectSpec['bitcoin_getAccountAddresses']['response'] {
  return connectedAddresses.map((accountId) => {
    const { address } = parseCaipAccountId(accountId);
    return { address };
  });
}

/**
 * Convert WalletConnect sign message params into the canonical Bitcoin Snap
 * request. The snap signs with the resolved account's key, so the optional
 * `address` and `protocol` hints are not forwarded.
 */
export function mapSignMessageRequest({
  params,
}: {
  params: BitcoinWalletConnectSpec['bitcoin_signMessage']['params'];
}): RpcRequest<BitcoinSnapSpec, 'signMessage'> {
  return {
    method: 'signMessage',
    params: {
      message: params.message,
    },
  };
}

/**
 * Forward the Bitcoin Snap signature in the WalletConnect `bitcoin_signMessage`
 * response shape. The signing `address` is the connected account address; the
 * snap returns only the signature.
 */
export function mapSignMessageResponse({
  connectedAddresses,
  result,
}: {
  connectedAddresses: CaipAccountId[];
  result: BitcoinSnapSpec['signMessage']['response'];
}): BitcoinWalletConnectSpec['bitcoin_signMessage']['response'] {
  const { address } = parseCaipAccountId(connectedAddresses[0]);

  return {
    address,
    signature: result.signature,
  };
}

/**
 * Convert WalletConnect `bitcoin_signPsbt` params into the canonical Bitcoin
 * Snap request. The dapp supplies a complete PSBT, so `fill` is `false`. The
 * snap signs every input it owns, so the per-input `signInputs` selection is
 * not forwarded.
 */
export function mapSignPsbtRequest({
  params,
}: {
  params: BitcoinWalletConnectSpec['bitcoin_signPsbt']['params'];
}): RpcRequest<BitcoinSnapSpec, 'signPsbt'> {
  return {
    method: 'signPsbt',
    params: {
      psbt: params.psbt,
      options: {
        fill: false,
        broadcast: params.broadcast ?? false,
      },
    },
  };
}

/**
 * Forward the Bitcoin Snap signed PSBT in the WalletConnect `bitcoin_signPsbt`
 * response shape. `txid` is only present when the PSBT was broadcast.
 */
export function mapSignPsbtResponse(
  result: BitcoinSnapSpec['signPsbt']['response'],
): BitcoinWalletConnectSpec['bitcoin_signPsbt']['response'] {
  return {
    psbt: result.psbt,
    ...(result.txid ? { txid: result.txid } : {}),
  };
}

/**
 * Convert WalletConnect `bitcoin_sendTransfer` params into the canonical
 * Bitcoin Snap request. WalletConnect targets a single recipient; the snap
 * takes a recipients array. Change is handled by the snap, so the optional
 * `changeAddress` and `memo` (OP_RETURN) fields are not forwarded.
 */
export function mapSendTransferRequest({
  params,
}: {
  params: BitcoinWalletConnectSpec['bitcoin_sendTransfer']['params'];
}): RpcRequest<BitcoinSnapSpec, 'sendTransfer'> {
  return {
    method: 'sendTransfer',
    params: {
      recipients: [
        {
          address: params.recipientAddress,
          amount: params.amount,
        },
      ],
    },
  };
}

/**
 * Forward the Bitcoin Snap transaction id in the WalletConnect
 * `bitcoin_sendTransfer` response shape.
 */
export function mapSendTransferResponse(
  result: BitcoinSnapSpec['sendTransfer']['response'],
): BitcoinWalletConnectSpec['bitcoin_sendTransfer']['response'] {
  return {
    txid: result.txid,
  };
}
