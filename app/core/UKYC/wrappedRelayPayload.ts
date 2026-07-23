import { toBase64Url } from './encoding';
import type { UkycClientMaterial } from './deriveClientMaterial';
import type { UkycStorageAccessToken } from './storageAccessToken';

/**
 * Builds the `wrapped_relay_payload` — the only client-derived material that
 * leaves the device. It is sent to the idOS Relay (through the UKYC API) so the
 * Relay can encrypt/decrypt and store KYC payloads on the user's behalf. See the
 * architecture doc, section "Client-Derived Material".
 *
 * Neither `local_user_secret` nor the private `signing_key` are ever included.
 * The `data_encryption_key` *is* included: it is intentionally shared with the
 * Relay so it can encrypt/decrypt payloads transiently.
 */

/**
 * The Relay-facing bundle. `data_encryption_key` is base64url-encoded secret
 * material shared with the Relay; the other fields are non-secret.
 */
export interface UkycWrappedRelayPayload {
  storage_id: string;
  data_encryption_key: string;
  signing_public_key: string;
  storage_access_token: UkycStorageAccessToken;
}

/**
 * Assembles the `wrapped_relay_payload` from derived client material and a
 * Relay-presented `storage_access_token`.
 *
 * The token must be scoped for the Relay to present (`presenter: 'idos-relay'`)
 * and must not authorize `delete`, which is never delegated to the Relay.
 *
 * @param material - Client material derived from `local_user_secret`.
 * @param storageAccessToken - A `read`/`write`-scoped, Relay-presented token.
 * @returns The `wrapped_relay_payload` to send to the Relay via the UKYC API.
 */
export function buildWrappedRelayPayload(
  material: UkycClientMaterial,
  storageAccessToken: UkycStorageAccessToken,
): UkycWrappedRelayPayload {
  const { presenter, operations } = storageAccessToken.payload;

  if (presenter !== 'idos-relay') {
    throw new Error(
      'UKYC: wrapped_relay_payload requires a Relay-presented storage_access_token.',
    );
  }

  if (operations.includes('delete')) {
    throw new Error(
      'UKYC: wrapped_relay_payload must not carry a delete-scoped storage_access_token.',
    );
  }

  return {
    storage_id: toBase64Url(material.storageId),
    data_encryption_key: toBase64Url(material.dataEncryptionKey),
    signing_public_key: toBase64Url(material.signingPublicKey),
    storage_access_token: storageAccessToken,
  };
}
