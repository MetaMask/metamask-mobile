/**
 * Tron-specific data extraction and normalization helpers.
 *
 * These are pure functions that deal with the various shapes dapps send for
 * Tron transactions and messages. They have no dependency on Engine,
 * controllers, or WalletConnect — only raw data in, structured data out.
 */

/**
 * Recursively extract the `rawDataHex` (or `raw_data_hex`) field from a
 * Tron transaction payload. Dapps may nest the value under `transaction`,
 * `tx`, or at the top level with either camelCase or snake_case keys.
 *
 * @param value - The raw transaction payload from a WalletConnect request.
 * @returns The hex-encoded raw data string, or `undefined` if not found.
 */
export const extractTronRawDataHex = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    raw_data_hex?: unknown;
    rawDataHex?: unknown;
    transaction?: unknown;
    tx?: unknown;
  };

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
};

/**
 * Recursively extract the transaction type from a Tron transaction payload.
 * Checks the top-level `type` field first, then falls back to the first
 * contract type in `raw_data.contract[0].type`, and finally recurses into
 * nested `transaction` / `tx` wrappers.
 *
 * @param value - The raw transaction payload from a WalletConnect request.
 * @returns The transaction type string, or `undefined` if not found.
 */
export const extractTronType = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    type?: unknown;
    transaction?: unknown;
    tx?: unknown;
    raw_data?: { contract?: { type?: unknown }[] };
  };

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
};

/**
 * Walk through the nested transaction wrappers dapps may send and return
 * the innermost plain transaction object. Dapps may nest the body under
 * `{ transaction: { transaction: { ... } } }` or `{ transaction: { ... } }`.
 *
 * @param params - The original WalletConnect request params.
 * @returns The innermost transaction object, or `undefined`.
 */
const extractOriginalTransaction = (
  params: unknown,
): Record<string, unknown> | undefined => {
  const firstParam = Array.isArray(params) ? params[0] : params;
  const container =
    typeof firstParam === 'object' && firstParam !== null
      ? (firstParam as Record<string, unknown>).transaction
      : undefined;

  if (
    typeof container !== 'object' ||
    container === null ||
    Array.isArray(container)
  ) {
    return undefined;
  }

  const inner = (container as Record<string, unknown>).transaction;
  if (typeof inner === 'object' && inner !== null) {
    return inner as Record<string, unknown>;
  }

  return container as Record<string, unknown>;
};

/**
 * Normalize the signing result the Tron Snap returns into the legacy shape
 * dapp Tron adapters expect: the original transaction body with a
 * `signature` array appended.
 *
 * When the result already looks like a full transaction (has a `txID`
 * field), it is returned unchanged.
 *
 * @param params - The original WalletConnect request params (pre-adaptation).
 * @param result - The raw result returned by the Tron Snap.
 * @returns The normalized result suitable for the WalletConnect response.
 */
export const normalizeSignTransactionResult = (
  params: unknown,
  result: unknown,
): unknown => {
  const originalTransaction = extractOriginalTransaction(params);

  const resultObject =
    typeof result === 'object' && result !== null && !Array.isArray(result)
      ? (result as Record<string, unknown>)
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
};
