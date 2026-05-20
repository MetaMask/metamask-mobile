import type {
  TronSnapMappedRequest,
  TronSnapSignatureResult,
  TronSnapSignMessageParams,
  TronSnapSignTransactionParams,
  TronWalletConnectMethod,
  TronWalletConnectRequest,
  TronWalletConnectSignMessageParams,
  TronWalletConnectSignTransactionParams,
  TronWalletConnectTransaction,
} from './types';

/**
 * Type guard for plain objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extract `raw_data_hex` from a WalletConnect transaction container, walking
 * the legacy double-wrap (`transaction.transaction`) if present.
 */
export function extractTronRawDataHex(
  value: Record<string, unknown> | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const candidate = value as TronWalletConnectTransaction;

  if (typeof candidate.raw_data_hex === 'string') {
    return candidate.raw_data_hex;
  }
  return extractTronRawDataHex(candidate.transaction);
}

/**
 * Extract the contract type from `raw_data.contract[0].type`, walking the
 * legacy double-wrap if present.
 */
export function extractTronType(
  value: Record<string, unknown> | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const candidate = value as TronWalletConnectTransaction;

  const contractType = candidate.raw_data?.contract?.[0]?.type;
  if (typeof contractType === 'string' && contractType.length > 0) {
    return contractType;
  }
  return extractTronType(candidate.transaction);
}

/**
 * Map a WC-shaped Tron request into the Tron Snap's params shape.
 *
 * `tron_signMessage` → `signMessage` (message base64-encoded);
 * `tron_signTransaction` → `signTransaction` (`raw_data_hex` →
 * `rawDataHex`).
 *
 * Throws on any other method. The WC namespace approval restricts dapps to
 * these two, so unsupported methods indicate a misbehaving client.
 */
export function mapRequestInbound({
  method,
  params,
}: TronWalletConnectRequest): TronSnapMappedRequest {
  const param = isRecord(params) ? params : undefined;

  if (method === 'tron_signMessage') {
    const mappedParams: Partial<TronSnapSignMessageParams> = {};
    const address = param?.address;
    const message = param?.message;

    if (typeof address === 'string') {
      mappedParams.address = address as TronSnapSignMessageParams['address'];
    }
    if (typeof message === 'string') {
      // The Tron snap requires `message` to be base64-encoded
      // (validated against /^(?:[A-Za-z0-9+/]{4})*...$/ then decoded via
      // Buffer.from(message, 'base64').toString('utf8')).
      mappedParams.message = Buffer.from(message, 'utf8').toString('base64');
    }

    return {
      method: 'signMessage',
      params: mappedParams,
    };
  }

  if (method === 'tron_signTransaction') {
    const rawDataHex = extractTronRawDataHex(param);
    const type = extractTronType(param);

    const mappedTransaction: Partial<
      TronSnapSignTransactionParams['transaction']
    > = {};
    if (typeof rawDataHex === 'string') {
      mappedTransaction.rawDataHex = rawDataHex;
    }
    if (typeof type === 'string') {
      mappedTransaction.type = type;
    }

    const mappedParams: {
      address?: TronSnapSignTransactionParams['address'];
      transaction: Partial<TronSnapSignTransactionParams['transaction']>;
    } = {
      transaction: mappedTransaction,
    };
    const address = param?.address;
    if (typeof address === 'string') {
      mappedParams.address =
        address as TronSnapSignTransactionParams['address'];
    }

    return {
      method: 'signTransaction',
      params: mappedParams,
    };
  }

  throw new Error(`WalletConnect Tron method ${method} is not supported`);
}

/**
 * Normalize the Tron Snap's response for a WC request before forwarding it
 * to the dapp.
 *
 * `tron_signTransaction` dapps expect the original transaction with a
 * `signature` array appended; the Snap returns just `{ signature }`, so we
 * re-attach it. `tron_signMessage` passes through unchanged. Throws on any
 * other method.
 */
export function mapRequestOutbound({
  method,
  params,
  result,
}: {
  method: TronWalletConnectMethod;
  params:
    | TronWalletConnectSignMessageParams
    | TronWalletConnectSignTransactionParams;
  result: TronSnapSignatureResult;
}):
  | TronSnapSignatureResult
  | (TronWalletConnectTransaction & {
      signature: string[];
    }) {
  if (method === 'tron_signMessage') {
    return result;
  }

  if (method === 'tron_signTransaction') {
    const { transaction: transactionContainer } =
      params as TronWalletConnectSignTransactionParams;

    // Legacy format double-wraps the transaction (`transaction.transaction`);
    // v1 passes it flat (`transaction`). Pick the innermost transaction object.
    const originalTransaction =
      isRecord(transactionContainer) &&
      isRecord(transactionContainer.transaction)
        ? transactionContainer.transaction
        : isRecord(transactionContainer)
          ? transactionContainer
          : undefined;

    const signature = result.signature;

    if (originalTransaction && typeof signature === 'string') {
      return {
        ...originalTransaction,
        signature: [signature],
      };
    }

    return result;
  }

  throw new Error(`WalletConnect Tron method ${method} is not supported`);
}
