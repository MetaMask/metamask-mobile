import type {
  TronSnapMappedRequest,
  TronSnapSignatureResult,
  TronSnapSignMessageParams,
  TronSnapSignTransaction,
  TronSnapSignTransactionParams,
  TronWalletConnectRequest,
  TronWalletConnectTransaction,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns the first WalletConnect param object regardless of whether the dapp
 * sent params as an array or as a single object.
 *
 * @param params - Raw WalletConnect request params.
 * @returns The first param object, or `undefined` when params are empty or not
 * object-shaped.
 */
function getFirstParam(params: unknown): unknown {
  if (Array.isArray(params)) {
    return params[0];
  }

  return isRecord(params) ? params : undefined;
}

/**
 * Extracts the raw Tron transaction data hex string from known WalletConnect
 * and TronWeb transaction shapes.
 *
 * Some dapps send `raw_data_hex`, some send `rawDataHex`, and some wrap the
 * transaction under `transaction` or `tx`.
 *
 * @param value - Candidate transaction container.
 * @returns The raw transaction data hex string when present.
 */
export function extractTronRawDataHex(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value as TronWalletConnectTransaction;

  if (typeof candidate.raw_data_hex === 'string') {
    return candidate.raw_data_hex;
  }
  if (typeof candidate.rawDataHex === 'string') {
    return candidate.rawDataHex;
  }
  return (
    extractTronRawDataHex(candidate.transaction) ??
    extractTronRawDataHex(candidate.tx)
  );
}

/**
 * Extracts the Tron contract type from known WalletConnect and TronWeb
 * transaction shapes.
 *
 * The type can be top-level (`type`) or embedded in
 * `raw_data.contract[0].type`, and the transaction can be nested under
 * `transaction` or `tx`.
 *
 * @param value - Candidate transaction container.
 * @returns The Tron contract type when present.
 */
export function extractTronType(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value as TronWalletConnectTransaction;

  if (typeof candidate.type === 'string' && candidate.type.length > 0) {
    return candidate.type;
  }
  const contractType = candidate.raw_data?.contract?.[0]?.type;
  if (typeof contractType === 'string' && contractType.length > 0) {
    return contractType;
  }
  return (
    extractTronType(candidate.transaction) ?? extractTronType(candidate.tx)
  );
}

/**
 * Map a WalletConnect-shaped Tron request into the params shape the Tron
 * Snap expects. Unrecognized methods are passed through unchanged.
 *
 * Supported mappings:
 * - `tron_signMessage` -> `signMessage`, with the message base64-encoded for
 * the Snap.
 * - `tron_signTransaction` -> `signTransaction`, with `raw_data_hex`
 * normalized to `rawDataHex`.
 *
 * `tron_sendTransaction` and `tron_getBalance` are recognized but unsupported
 * by this bridge and throw explicit errors.
 *
 * @param request - WalletConnect method and raw params.
 * @returns A Snap-shaped request for the Tron Snap, or the original method and
 * params when the method is not recognized by this mapper.
 * @throws When the WalletConnect method is recognized but unsupported.
 */
export function mapRequestInbound({
  method,
  params,
}: TronWalletConnectRequest): TronSnapMappedRequest {
  const firstParam = getFirstParam(params);

  if (method === 'tron_signMessage') {
    const mappedParams: TronSnapSignMessageParams = {};
    const address = isRecord(firstParam) ? firstParam.address : undefined;
    const message = isRecord(firstParam) ? firstParam.message : undefined;

    if (typeof address === 'string') {
      mappedParams.address = address;
    }
    if (typeof message === 'string') {
      // The Tron snap requires `message` to be base64-encoded
      // (validated against /^(?:[A-Za-z0-9+/]{4})*...$/ then decoded via
      // Buffer.from(message, 'base64').toString('utf8')).
      // WC dapps send either a hex string ('0x...') or a plain UTF-8 string.
      const utf8Message = message.startsWith('0x')
        ? Buffer.from(message.slice(2), 'hex').toString('utf8')
        : message;
      mappedParams.message = Buffer.from(utf8Message, 'utf8').toString(
        'base64',
      );
    }

    const mapped: TronSnapMappedRequest = {
      method: 'signMessage',
      params: mappedParams,
    };
    return mapped;
  }

  if (method === 'tron_signTransaction') {
    const transaction = isRecord(firstParam)
      ? firstParam.transaction
      : undefined;

    const rawDataHex = extractTronRawDataHex(firstParam ?? transaction);
    const type = extractTronType(firstParam ?? transaction);

    const mappedTransaction: TronSnapSignTransaction = {};
    if (typeof rawDataHex === 'string') {
      mappedTransaction.rawDataHex = rawDataHex;
    }
    if (typeof type === 'string') {
      mappedTransaction.type = type;
    }

    const mappedParams: TronSnapSignTransactionParams = {
      transaction: mappedTransaction,
    };
    const address = isRecord(firstParam) ? firstParam.address : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }

    const mapped: TronSnapMappedRequest = {
      method: 'signTransaction',
      params: mappedParams,
    };
    return mapped;
  }

  if (method === 'tron_sendTransaction') {
    throw new Error(
      'WalletConnect Tron method tron_sendTransaction is not supported',
    );
  }

  if (method === 'tron_getBalance') {
    throw new Error(
      'WalletConnect Tron method tron_getBalance is not supported',
    );
  }

  return { method, params };
}

/**
 * Normalize the response that the Tron Snap returns for a Tron WalletConnect
 * request before forwarding it to the dapp.
 *
 * Tron dapps that initiated a `tron_signTransaction` expect to receive the
 * original transaction object with a `signature` field appended. The Snap,
 * however, returns just `{ signature }`. When we detect that pattern, we
 * re-attach the original transaction so the dapp can broadcast it.
 *
 * Other Tron methods are returned unchanged.
 *
 * @param request - Original WalletConnect method and params plus the raw Snap
 * result.
 * @returns The dapp-facing result. For `tron_signTransaction`, this can be the
 * original transaction object with a normalized `signature` array appended.
 */
export function mapRequestOutbound({
  method,
  params,
  result,
}: {
  method: string;
  params: unknown;
  result: unknown;
}): unknown {
  if (method !== 'tron_signTransaction') {
    return result;
  }

  const firstParam = getFirstParam(params);
  const transactionContainer = isRecord(firstParam)
    ? firstParam.transaction
    : undefined;

  const originalTransaction =
    isRecord(transactionContainer) && isRecord(transactionContainer.transaction)
      ? transactionContainer.transaction
      : isRecord(transactionContainer)
        ? transactionContainer
        : undefined;

  const resultObject: TronSnapSignatureResult | undefined = isRecord(result)
    ? result
    : undefined;
  const signatureValue = resultObject?.signature;
  const normalizedSignature = Array.isArray(signatureValue)
    ? signatureValue
    : typeof signatureValue === 'string'
      ? [signatureValue]
      : undefined;

  if (
    originalTransaction &&
    normalizedSignature &&
    !(typeof resultObject?.txID === 'string')
  ) {
    return {
      ...originalTransaction,
      signature: normalizedSignature,
    };
  }

  return result;
}
