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
 * Type guard to check if a value is a plain object (i.e. a record) rather than
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extracts the raw Tron transaction data hex string from a WalletConnect
 * transaction container.
 *
 * Handles both the v1 format (`raw_data_hex` directly on the transaction) and
 * the legacy format (`raw_data_hex` inside a nested `transaction` wrapper).
 *
 * @param value - Candidate transaction container.
 * @returns The raw transaction data hex string when present.
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
 * Extracts the Tron contract type from a WalletConnect transaction container.
 *
 * The type lives inside `raw_data.contract[0].type`. The transaction can be
 * directly accessible (v1) or nested under `transaction` (legacy).
 *
 * @param value - Candidate transaction container.
 * @returns The Tron contract type when present.
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
 * Map a WalletConnect-shaped Tron request into the params shape the Tron
 * Snap expects.
 *
 * Supported mappings:
 * - `tron_signMessage` -> `signMessage`, with the message base64-encoded for
 * the Snap.
 * - `tron_signTransaction` -> `signTransaction`, with `raw_data_hex`
 * normalized to `rawDataHex`.
 *
 * Any other method throws — the WC namespace approval already restricts
 * dapps to the two supported methods, so anything else indicates a
 * misbehaving client.
 *
 * @param request - WalletConnect method and raw params.
 * @returns A Snap-shaped request for the Tron Snap.
 * @throws When the WalletConnect method is not supported by this bridge.
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
 * Normalize the response that the Tron Snap returns for a Tron WalletConnect
 * request before forwarding it to the dapp.
 *
 * Tron dapps that initiated a `tron_signTransaction` expect to receive the
 * original transaction object with a `signature` array appended. The Snap
 * returns just `{ signature: string }`, so we re-attach it to the dapp's
 * original transaction. `tron_signMessage` is a straight pass-through.
 *
 * @param request - Original WalletConnect method and params plus the Snap
 * result.
 * @returns The dapp-facing result. For `tron_signTransaction`, the original
 * transaction object with a `signature` array appended; for
 * `tron_signMessage`, the Snap result unchanged.
 * @throws When the WalletConnect method is not supported by this bridge.
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
