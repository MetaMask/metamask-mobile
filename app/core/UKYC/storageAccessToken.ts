import { ed25519 } from '@noble/curves/ed25519';
import { stringToBytes } from '@metamask/utils';
import {
  UKYC_STORAGE_ACCESS_TOKEN_AUDIENCE,
  UKYC_STORAGE_ACCESS_TOKEN_VERSION,
} from './constants';
import { toBase64Url } from './encoding';
import type { UkycClientMaterial } from './deriveClientMaterial';

/**
 * Mints `storage_access_token` capabilities — the client-signed, scoped,
 * session-bound proofs that authorize UKYC storage operations. See the
 * architecture doc, section "Storage Authentication".
 *
 * The token is Ed25519 over RFC 8785 (JCS) canonical JSON of the payload. Only
 * the client holds the private `signing_key`, so only the client can mint a
 * token; a `read`/`write`-scoped token may then be handed to the Relay to
 * present, but `delete` is never delegated.
 */

/**
 * Storage operations a `storage_access_token` can authorize.
 */
export type UkycStorageOperation = 'read' | 'write' | 'delete';

/**
 * Who presents the token to UKYC storage. The Relay may only present
 * `read`/`write` tokens; `delete` is always client-presented.
 */
export type UkycTokenPresenter = 'client' | 'idos-relay';

/**
 * The signed `storage_access_token` payload. Field names are snake_case because
 * they are canonicalized and hashed exactly as they appear on the wire.
 */
export interface UkycStorageAccessTokenPayload {
  version: number;
  aud: string;
  storage_id: string;
  signing_public_key: string;
  operations: UkycStorageOperation[];
  presenter: UkycTokenPresenter;
  /** UKYC session id. Required (and only present) when presenter is `idos-relay`. */
  session_id?: string;
  issued_at: string;
  expires_at: string;
}

/**
 * The on-the-wire envelope: the payload plus its detached Ed25519 signature
 * (base64url) over the JCS canonicalization of the payload.
 */
export interface UkycStorageAccessToken {
  payload: UkycStorageAccessTokenPayload;
  signature: string;
}

/**
 * Inputs for minting a `storage_access_token`.
 */
export interface SignStorageAccessTokenParams {
  /** Client material derived from `local_user_secret`. */
  material: UkycClientMaterial;
  /** Operations the token authorizes. `delete` must be the sole operation. */
  operations: UkycStorageOperation[];
  /** Who will present the token. Defaults to `client`. */
  presenter?: UkycTokenPresenter;
  /** UKYC session id. Required when presenter is `idos-relay`. */
  sessionId?: string;
  /** Token issue time. Defaults to now. */
  issuedAt?: Date;
  /** Token expiry. Must be strictly after `issuedAt`. */
  expiresAt: Date;
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/**
 * Serializes a JSON value to RFC 8785 (JCS) canonical form.
 *
 * Scope note: this implementation covers the JSON shapes used by UKYC storage
 * payloads — objects, arrays, strings, integers, booleans, and null. Object
 * members are sorted by their UTF-16 code units (matching JS default string
 * ordering, which is what JCS requires) and `undefined` members are dropped.
 * Non-finite and non-integer numbers are rejected, since the payloads never
 * contain them and correct JCS number formatting for the general case is
 * intentionally out of scope here.
 *
 * @param value - The value to canonicalize.
 * @returns The canonical JSON string.
 */
export function canonicalizeJson(value: JsonValue): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error(
        'UKYC: cannot canonicalize a non-integer number for JCS.',
      );
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .reduce<string[]>((acc, key) => {
      const child = value[key];
      if (child !== undefined) {
        acc.push(`${JSON.stringify(key)}:${canonicalizeJson(child)}`);
      }
      return acc;
    }, []);

  return `{${entries.join(',')}}`;
}

/**
 * Builds and signs a `storage_access_token`.
 *
 * @param params - See {@link SignStorageAccessTokenParams}.
 * @returns The signed token envelope.
 */
export function signStorageAccessToken(
  params: SignStorageAccessTokenParams,
): UkycStorageAccessToken {
  const {
    material,
    operations,
    presenter = 'client',
    sessionId,
    issuedAt = new Date(),
    expiresAt,
  } = params;

  assertValidOperations(operations);

  if (expiresAt.getTime() <= issuedAt.getTime()) {
    throw new Error('UKYC: storage_access_token expires_at must be after issued_at.');
  }

  const isDelete = operations.includes('delete');

  if (presenter === 'idos-relay' && isDelete) {
    throw new Error(
      'UKYC: a delete-scoped storage_access_token cannot be delegated to the Relay.',
    );
  }

  if (presenter === 'idos-relay' && !sessionId) {
    throw new Error(
      'UKYC: a Relay-presented storage_access_token requires a session_id.',
    );
  }

  const payload: UkycStorageAccessTokenPayload = {
    version: UKYC_STORAGE_ACCESS_TOKEN_VERSION,
    aud: UKYC_STORAGE_ACCESS_TOKEN_AUDIENCE,
    storage_id: toBase64Url(material.storageId),
    signing_public_key: toBase64Url(material.signingPublicKey),
    operations,
    presenter,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  // Only bind session_id for Relay-presented tokens; omit the key entirely for
  // client-presented tokens so it does not appear in the canonicalized payload.
  if (presenter === 'idos-relay') {
    payload.session_id = sessionId;
  }

  const message = stringToBytes(canonicalizeJson(payload));
  const signature = ed25519.sign(message, material.signingKey);

  return {
    payload,
    signature: toBase64Url(signature),
  };
}

/**
 * Serializes a signed token to a compact string suitable for header transport
 * (e.g. `Authorization: StorageAccessToken <token>`). The complete envelope is
 * base64url-encoded; the private `signing_key` is never included.
 *
 * @param token - The signed token envelope.
 * @returns The base64url-encoded envelope string.
 */
export function encodeStorageAccessTokenForHeader(
  token: UkycStorageAccessToken,
): string {
  return toBase64Url(stringToBytes(JSON.stringify(token)));
}

/**
 * Validates that an operations list is one storage understands: a non-empty set
 * of `read`/`write`, or exactly `['delete']`. `delete` is never combined with
 * other operations.
 *
 * @param operations - The requested operations.
 */
function assertValidOperations(operations: UkycStorageOperation[]): void {
  if (operations.length === 0) {
    throw new Error('UKYC: storage_access_token requires at least one operation.');
  }

  const unique = new Set(operations);

  if (unique.size !== operations.length) {
    throw new Error('UKYC: storage_access_token operations must be unique.');
  }

  if (unique.has('delete') && operations.length > 1) {
    throw new Error(
      'UKYC: a delete-scoped storage_access_token must contain only "delete".',
    );
  }
}
