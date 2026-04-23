/**
 * WalletConnect ↔ CAIP request/response mapping for the Tron namespace.
 *
 * Translates dapp-facing WalletConnect methods (e.g. `tron_signTransaction`)
 * into the Snap-facing CAIP methods (e.g. `signTransaction`) and normalizes
 * the params/results between the two formats.
 */

import type { RequestMapper, ResponseMapper } from '../types';
import {
  extractTronRawDataHex,
  extractTronType,
  normalizeSignTransactionResult,
} from './utils';

/**
 * Map a WalletConnect `tron_*` request into the shape expected by the Tron
 * Snap's keyring handler. Strips the `tron_` prefix and normalizes params
 * (e.g. extracts `rawDataHex` from the various dapp payload formats).
 *
 * @param request - The raw WalletConnect method and params.
 * @returns The mapped method and params for the Snap.
 */
export const tronRequestMapper: RequestMapper = ({ method, params }) => {
  const firstParam = Array.isArray(params)
    ? params.length > 0
      ? params[0]
      : undefined
    : params && typeof params === 'object'
      ? params
      : undefined;

  if (method === 'tron_signMessage') {
    const mappedParams: Record<string, string> = {};
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    const message =
      firstParam && typeof firstParam === 'object' && 'message' in firstParam
        ? firstParam.message
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }
    if (typeof message === 'string') {
      mappedParams.message = message;
    }
    return { method: 'signMessage', params: mappedParams };
  }

  if (method === 'tron_signTransaction') {
    const transactionContainer =
      firstParam &&
      typeof firstParam === 'object' &&
      'transaction' in firstParam
        ? (firstParam as Record<string, unknown>).transaction
        : firstParam;

    const rawDataHex = extractTronRawDataHex(
      firstParam ?? transactionContainer,
    );
    const type = extractTronType(firstParam ?? transactionContainer);

    const mappedTransaction: Record<string, string> = {};
    if (typeof rawDataHex === 'string') {
      mappedTransaction.rawDataHex = rawDataHex;
    }
    if (typeof type === 'string') {
      mappedTransaction.type = type;
    }

    const mappedParams: {
      address?: string;
      transaction: Record<string, string>;
    } = { transaction: mappedTransaction };
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }

    return { method: 'signTransaction', params: mappedParams };
  }

  if (method === 'tron_sendTransaction') {
    return { method: 'sendTransaction', params };
  }

  if (method === 'tron_getBalance') {
    return { method: 'getBalance', params };
  }

  return { method, params };
};

/**
 * Post-process a Snap result before the wallet responds to the dapp.
 * For `tron_signTransaction`, re-assembles the response into the legacy
 * shape dapps expect (original transaction body + `signature` array).
 *
 * @param params - The original WalletConnect method, params, and snap result.
 * @returns The response to send back to the dapp via WalletConnect.
 */
export const tronResponseMapper: ResponseMapper = ({
  method,
  params,
  result,
}) => {
  if (method === 'tron_signTransaction') {
    return normalizeSignTransactionResult(params, result);
  }
  return result;
};
