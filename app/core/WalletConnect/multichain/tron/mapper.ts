import { isObject } from '@metamask/utils';
import type { RpcRequest } from '../types';
import type {
  TronAddress,
  TronSnapSpec,
  TronWalletConnectSpec,
  TronWalletConnectTransaction,
} from './types';

/**
 * Extract `raw_data_hex` from a WalletConnect transaction, walking the legacy
 * double-wrap (`transaction.transaction`) if present.
 */
export function extractTronRawDataHex(
  transaction: TronWalletConnectTransaction | undefined,
): string | undefined {
  if (!transaction) {
    return undefined;
  }
  if (typeof transaction.raw_data_hex === 'string') {
    return transaction.raw_data_hex;
  }
  return extractTronRawDataHex(transaction.transaction);
}

/**
 * Extract the contract type from `raw_data.contract[0].type`, walking the
 * legacy double-wrap if present.
 */
export function extractTronType(
  transaction: TronWalletConnectTransaction | undefined,
): string | undefined {
  if (!transaction) {
    return undefined;
  }
  const contractType = transaction.raw_data?.contract?.[0]?.type;
  if (typeof contractType === 'string' && contractType.length > 0) {
    return contractType;
  }
  return extractTronType(transaction.transaction);
}

/**
 * Unwrap the legacy double-wrap (`transaction.transaction`) if present.
 */
function unwrapTronTransaction(
  transaction: TronWalletConnectTransaction,
): TronWalletConnectTransaction {
  return isObject(transaction.transaction)
    ? transaction.transaction
    : transaction;
}

/**
 * Convert WalletConnect message signing params into the canonical Tron Snap
 * request. The Tron snap expects `message` to be base64-encoded.
 */
export function mapSignMessageRequest({
  params,
}: {
  params: TronWalletConnectSpec['tron_signMessage']['params'];
}): RpcRequest<TronSnapSpec, 'signMessage'> {
  return {
    method: 'signMessage',
    params: {
      address: params.address as TronAddress,
      message: Buffer.from(params.message, 'utf8').toString('base64'),
    },
  };
}

/**
 * Forward the Tron Snap message signature in the WalletConnect
 * `tron_signMessage` response shape.
 */
export function mapSignMessageResponse(
  result: TronSnapSpec['signMessage']['response'],
): TronWalletConnectSpec['tron_signMessage']['response'] {
  return result;
}

/**
 * Convert WalletConnect transaction signing params into the canonical Tron
 * Snap transaction request. WalletConnect can send either the v1 flat
 * transaction or the legacy double-wrapped shape.
 */
export function mapSignTransactionRequest({
  params,
}: {
  params: TronWalletConnectSpec['tron_signTransaction']['params'];
}): RpcRequest<TronSnapSpec, 'signTransaction'> {
  const transaction: TronSnapSpec['signTransaction']['params']['transaction'] =
    {};

  const rawDataHex = extractTronRawDataHex(params.transaction);
  if (typeof rawDataHex === 'string') {
    transaction.rawDataHex = rawDataHex;
  }

  const type = extractTronType(params.transaction);
  if (typeof type === 'string') {
    transaction.type = type;
  }

  return {
    method: 'signTransaction',
    params: {
      address: params.address as TronAddress,
      transaction,
    },
  };
}

/**
 * Convert the Tron Snap transaction signature into the response expected by
 * WalletConnect Tron dapps: the original transaction with the signature
 * appended as `signature: [hexSignature]`.
 */
export function mapSignTransactionResponse({
  params,
  result,
}: {
  params: TronWalletConnectSpec['tron_signTransaction']['params'];
  result: TronSnapSpec['signTransaction']['response'];
}): TronWalletConnectSpec['tron_signTransaction']['response'] {
  return {
    ...unwrapTronTransaction(params.transaction),
    signature: [result.signature],
  };
}
