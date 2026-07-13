import { rpcErrors } from '@metamask/rpc-errors';

/**
 * Round-trips a typed-data JSON string through JSON.parse / JSON.stringify to
 * produce a canonical representation.  JSON.parse silently drops duplicate keys
 * (keeping the last value per key), so the canonical string can never contain
 * duplicates that let a regex-based extraction diverge from the parsed object
 * used at signing time.
 *
 * This mirrors the normalizeTypedMessage step that the extension performs via
 * @metamask/eth-json-rpc-middleware before data reaches SignatureController.
 */
export function canonicalizeTypedMessageData(data: string): string {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return JSON.stringify(JSON.parse(data));
  } catch {
    return data;
  }
}

const ALLOWED_TYPED_MESSAGE_KEYS = new Set([
  'types',
  'primaryType',
  'domain',
  'message',
  'metadata',
]);

/**
 * Rejects EIP-712 payloads with top-level keys outside the EIP-712 schema.
 * Extra keys bypass the confirmation UI but appear in the "Copy raw data"
 * export, enabling spoofing in multisig workflows. Mirrors the
 * validateTypedMessageKeys check from @metamask/eth-json-rpc-middleware
 * that the extension applies on V4 (and should apply on V3).
 */
export function rejectExtraneousTypedMessageKeys(data: string): void {
  if (typeof data !== 'string') {
    return;
  }
  try {
    const keys = Object.keys(JSON.parse(data));
    if (keys.some((key) => !ALLOWED_TYPED_MESSAGE_KEYS.has(key))) {
      throw rpcErrors.invalidInput();
    }
  } catch (e) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: number }).code === -32000
    ) {
      throw e;
    }
  }
}
