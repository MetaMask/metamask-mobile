import { rpcErrors } from '@metamask/rpc-errors';

type TypedMessageData = string | Record<string, unknown>;

function toJsonString(data: TypedMessageData): string {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

/**
 * Round-trips typed-data through JSON.parse / JSON.stringify to produce a
 * canonical string. Handles both string and object inputs — object payloads
 * are stringified first. JSON.parse silently drops duplicate keys (keeping
 * the last value per key), preventing regex-based extraction from diverging
 * from the parsed object used at signing time.
 *
 * This mirrors the normalizeTypedMessage step that the extension performs via
 * @metamask/eth-json-rpc-middleware before data reaches SignatureController.
 */
export function canonicalizeTypedMessageData(data: TypedMessageData): string {
  try {
    const jsonString = toJsonString(data);
    return JSON.stringify(JSON.parse(jsonString));
  } catch {
    return toJsonString(data);
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
 * Handles both string and object inputs. Extra keys bypass the confirmation
 * UI but appear in the "Copy raw data" export, enabling spoofing in multisig
 * workflows. Mirrors validateTypedMessageKeys from
 * @metamask/eth-json-rpc-middleware.
 */
export function rejectExtraneousTypedMessageKeys(data: TypedMessageData): void {
  try {
    const parsed =
      typeof data === 'string' ? JSON.parse(data) : (data as object);
    const keys = Object.keys(parsed);
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
