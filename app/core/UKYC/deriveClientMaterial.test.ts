import { ed25519 } from '@noble/curves/ed25519';
import { areUint8ArraysEqual } from '@metamask/utils';
import {
  deriveClientMaterial,
  encodeClientMaterial,
} from './deriveClientMaterial';
import { UKYC_DERIVED_KEY_SIZES, UKYC_USER_KEY_SIZE_BYTES } from './constants';

const USER_KEY = new Uint8Array(UKYC_USER_KEY_SIZE_BYTES).fill(42);
const OTHER_USER_KEY = new Uint8Array(UKYC_USER_KEY_SIZE_BYTES).fill(43);

describe('UKYC deriveClientMaterial', () => {
  it('derives each value at the documented length', () => {
    const material = deriveClientMaterial(USER_KEY);

    expect(material.storageId).toHaveLength(UKYC_DERIVED_KEY_SIZES.storageId);
    expect(material.contentEncryptionKey).toHaveLength(
      UKYC_DERIVED_KEY_SIZES.contentEncryptionKey,
    );
    expect(material.storageSigningSeed).toHaveLength(
      UKYC_DERIVED_KEY_SIZES.storageSigningSeed,
    );
    expect(material.relayTunnelKey).toHaveLength(
      UKYC_DERIVED_KEY_SIZES.relayTunnelKey,
    );
    // Ed25519 public keys are 32 bytes.
    expect(material.storagePublicKey).toHaveLength(32);
  });

  it('is deterministic for the same user_key', () => {
    const a = deriveClientMaterial(USER_KEY);
    const b = deriveClientMaterial(USER_KEY);

    expect(a).toEqual(b);
  });

  it('produces different material for a different user_key', () => {
    const a = deriveClientMaterial(USER_KEY);
    const b = deriveClientMaterial(OTHER_USER_KEY);

    expect(areUint8ArraysEqual(a.storageId, b.storageId)).toBe(false);
    expect(
      areUint8ArraysEqual(a.contentEncryptionKey, b.contentEncryptionKey),
    ).toBe(false);
    expect(
      areUint8ArraysEqual(a.storageSigningSeed, b.storageSigningSeed),
    ).toBe(false);
    expect(areUint8ArraysEqual(a.relayTunnelKey, b.relayTunnelKey)).toBe(
      false,
    );
  });

  it('domain-separates the derived values from one another', () => {
    const { storageId, contentEncryptionKey, storageSigningSeed, relayTunnelKey } =
      deriveClientMaterial(USER_KEY);
    const values = [
      storageId,
      contentEncryptionKey,
      storageSigningSeed,
      relayTunnelKey,
    ];

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        expect(areUint8ArraysEqual(values[i], values[j])).toBe(false);
      }
    }
  });

  it('exposes the signing seed as the Ed25519 signing key', () => {
    const material = deriveClientMaterial(USER_KEY);

    expect(material.storageSigningKey).toEqual(material.storageSigningSeed);
  });

  it('derives a storage public key that matches the signing seed', () => {
    const material = deriveClientMaterial(USER_KEY);

    expect(material.storagePublicKey).toEqual(
      ed25519.getPublicKey(material.storageSigningSeed),
    );
  });

  it('produces a working Ed25519 keypair for storage authorization', () => {
    const material = deriveClientMaterial(USER_KEY);
    const message = new TextEncoder().encode('storage-authorization-payload');

    const signature = ed25519.sign(message, material.storageSigningKey);

    expect(
      ed25519.verify(signature, message, material.storagePublicKey),
    ).toBe(true);
  });
});

describe('UKYC encodeClientMaterial', () => {
  it('encodes storage_id and public key as unpadded base64url', () => {
    const material = deriveClientMaterial(USER_KEY);

    const encoded = encodeClientMaterial(material);

    expect(encoded.storageId).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(encoded.storagePublicKey).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(encoded.storageId).not.toContain('=');
    expect(encoded.storagePublicKey).not.toContain('=');
  });

  it('omits secret material from the encoded output', () => {
    const material = deriveClientMaterial(USER_KEY);

    const encoded = encodeClientMaterial(material);

    expect(Object.keys(encoded).sort()).toEqual([
      'storageId',
      'storagePublicKey',
    ]);
  });
});
