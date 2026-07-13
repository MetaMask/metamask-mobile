import { ed25519 } from '@noble/curves/ed25519';
import { areUint8ArraysEqual } from '@metamask/utils';
import {
  deriveClientMaterial,
  encodeClientMaterial,
} from './deriveClientMaterial';
import {
  UKYC_DERIVED_KEY_SIZES,
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
} from './constants';

const LOCAL_USER_SECRET = new Uint8Array(
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
).fill(42);
const OTHER_LOCAL_USER_SECRET = new Uint8Array(
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
).fill(43);

describe('UKYC deriveClientMaterial', () => {
  it('derives each value at the documented length', () => {
    const material = deriveClientMaterial(LOCAL_USER_SECRET);

    expect(material.storageId).toHaveLength(UKYC_DERIVED_KEY_SIZES.storageId);
    expect(material.dataEncryptionKey).toHaveLength(
      UKYC_DERIVED_KEY_SIZES.dataEncryptionKey,
    );
    expect(material.signingKey).toHaveLength(
      UKYC_DERIVED_KEY_SIZES.signingKey,
    );
    expect(material.relayTunnelKey).toHaveLength(
      UKYC_DERIVED_KEY_SIZES.relayTunnelKey,
    );
    // Ed25519 public keys are 32 bytes.
    expect(material.signingPublicKey).toHaveLength(32);
  });

  it('is deterministic for the same local_user_secret', () => {
    const a = deriveClientMaterial(LOCAL_USER_SECRET);
    const b = deriveClientMaterial(LOCAL_USER_SECRET);

    expect(a).toEqual(b);
  });

  it('produces different material for a different local_user_secret', () => {
    const a = deriveClientMaterial(LOCAL_USER_SECRET);
    const b = deriveClientMaterial(OTHER_LOCAL_USER_SECRET);

    expect(areUint8ArraysEqual(a.storageId, b.storageId)).toBe(false);
    expect(
      areUint8ArraysEqual(a.dataEncryptionKey, b.dataEncryptionKey),
    ).toBe(false);
    expect(areUint8ArraysEqual(a.signingKey, b.signingKey)).toBe(false);
    expect(areUint8ArraysEqual(a.relayTunnelKey, b.relayTunnelKey)).toBe(
      false,
    );
  });

  it('domain-separates the derived values from one another', () => {
    const { storageId, dataEncryptionKey, signingKey, relayTunnelKey } =
      deriveClientMaterial(LOCAL_USER_SECRET);
    const values = [storageId, dataEncryptionKey, signingKey, relayTunnelKey];

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        expect(areUint8ArraysEqual(values[i], values[j])).toBe(false);
      }
    }
  });

  it('derives a signing public key that matches the signing key', () => {
    const material = deriveClientMaterial(LOCAL_USER_SECRET);

    expect(material.signingPublicKey).toEqual(
      ed25519.getPublicKey(material.signingKey),
    );
  });

  it('produces a working Ed25519 keypair for storage authorization', () => {
    const material = deriveClientMaterial(LOCAL_USER_SECRET);
    const message = new TextEncoder().encode('storage-authorization-payload');

    const signature = ed25519.sign(message, material.signingKey);

    expect(
      ed25519.verify(signature, message, material.signingPublicKey),
    ).toBe(true);
  });
});

describe('UKYC encodeClientMaterial', () => {
  it('encodes storage_id and signing public key as unpadded base64url', () => {
    const material = deriveClientMaterial(LOCAL_USER_SECRET);

    const encoded = encodeClientMaterial(material);

    expect(encoded.storageId).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(encoded.signingPublicKey).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(encoded.storageId).not.toContain('=');
    expect(encoded.signingPublicKey).not.toContain('=');
  });

  it('omits secret material from the encoded output', () => {
    const material = deriveClientMaterial(LOCAL_USER_SECRET);

    const encoded = encodeClientMaterial(material);

    expect(Object.keys(encoded).sort()).toEqual([
      'signingPublicKey',
      'storageId',
    ]);
  });
});
