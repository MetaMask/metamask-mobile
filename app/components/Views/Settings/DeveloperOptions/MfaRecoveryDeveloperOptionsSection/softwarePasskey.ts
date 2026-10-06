import { p256 } from '@noble/curves/p256';
import {
  bytesToBase64,
  bytesToHex,
  concatBytes,
  hexToBytes,
  sha256,
  stringToBytes,
} from '@metamask/utils';

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;

/** Unpadded base64url, the encoding WebAuthn JSON uses for binary fields. */
export function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
}

export interface SoftwarePasskeyState {
  /** Hex P-256 private key. */
  privateKey: string;
  /** Hex credential id. */
  credentialId: string;
}

interface Ceremony {
  rpId: string;
  origin: string;
  /** base64url challenge, as given by the relying party. */
  challenge: string;
}

/**
 * WebAuthn authenticator held in memory, so tests can run passkey ceremonies
 * without a device or user interaction. Test credentials only.
 */
export class SoftwarePasskey {
  readonly #privateKey: Uint8Array;

  readonly #credentialId: Uint8Array;

  constructor(state?: SoftwarePasskeyState) {
    this.#privateKey = state
      ? hexToBytes(state.privateKey)
      : p256.utils.randomPrivateKey();
    this.#credentialId = state
      ? hexToBytes(state.credentialId)
      : globalThis.crypto.getRandomValues(new Uint8Array(16));
  }

  get credentialId(): string {
    return base64Url(this.#credentialId);
  }

  get publicJwk() {
    const point = p256.getPublicKey(this.#privateKey, false);
    return {
      kty: 'EC',
      crv: 'P-256',
      x: base64Url(point.slice(1, 33)),
      y: base64Url(point.slice(33)),
    };
  }

  export(): SoftwarePasskeyState {
    return {
      privateKey: bytesToHex(this.#privateKey),
      credentialId: bytesToHex(this.#credentialId),
    };
  }

  /** `navigator.credentials.create()` result with a `none` attestation. */
  async create({ rpId, origin, challenge }: Ceremony) {
    const point = p256.getPublicKey(this.#privateKey, false);
    // COSE_Key {kty: EC2, alg: ES256, crv: P-256, x, y}
    const coseKey = concatBytes([
      Uint8Array.of(0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20),
      point.slice(1, 33),
      Uint8Array.of(0x22, 0x58, 0x20),
      point.slice(33),
    ]);
    const authenticatorData = concatBytes([
      await sha256(stringToBytes(rpId)),
      Uint8Array.of(FLAG_UP | FLAG_UV | FLAG_AT, 0, 0, 0, 0),
      new Uint8Array(16), // AAGUID
      Uint8Array.of(this.#credentialId.length >> 8, this.#credentialId.length),
      this.#credentialId,
      coseKey,
    ]);
    // CBOR {fmt: "none", attStmt: {}, authData}
    const attestationObject = concatBytes([
      Uint8Array.of(0xa3),
      cborText('fmt'),
      cborText('none'),
      cborText('attStmt'),
      Uint8Array.of(0xa0),
      cborText('authData'),
      Uint8Array.of(0x58, authenticatorData.length),
      authenticatorData,
    ]);
    return {
      id: this.credentialId,
      rawId: this.credentialId,
      type: 'public-key',
      response: {
        clientDataJSON: base64Url(
          stringToBytes(clientData('webauthn.create', challenge, origin)),
        ),
        attestationObject: base64Url(attestationObject),
      },
    };
  }

  /** `navigator.credentials.get()` result, user present and verified. */
  async get({
    rpId,
    origin,
    challenge,
    userHandle,
  }: Ceremony & { userHandle?: string }) {
    const clientDataJSON = clientData('webauthn.get', challenge, origin);
    const authenticatorData = concatBytes([
      await sha256(stringToBytes(rpId)),
      Uint8Array.of(FLAG_UP | FLAG_UV, 0, 0, 0, 0),
    ]);
    const signedData = concatBytes([
      authenticatorData,
      await sha256(stringToBytes(clientDataJSON)),
    ]);
    const signature = p256
      .sign(signedData, this.#privateKey, { prehash: true })
      .toDERRawBytes();
    return {
      id: this.credentialId,
      rawId: this.credentialId,
      type: 'public-key',
      response: {
        clientDataJSON: base64Url(stringToBytes(clientDataJSON)),
        authenticatorData: base64Url(authenticatorData),
        signature: base64Url(signature),
        userHandle,
      },
    };
  }
}

function clientData(type: string, challenge: string, origin: string): string {
  return JSON.stringify({ type, challenge, origin, crossOrigin: false });
}

/** CBOR text string shorter than 24 bytes. */
function cborText(value: string): Uint8Array {
  const bytes = stringToBytes(value);
  return concatBytes([Uint8Array.of(0x60 + bytes.length), bytes]);
}
