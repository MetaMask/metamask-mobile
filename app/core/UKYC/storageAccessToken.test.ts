import { ed25519 } from '@noble/curves/ed25519';
import { base64ToBytes, stringToBytes } from '@metamask/utils';
import { deriveClientMaterial } from './deriveClientMaterial';
import {
  canonicalizeJson,
  encodeStorageAccessTokenForHeader,
  signStorageAccessToken,
} from './storageAccessToken';
import {
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
  UKYC_STORAGE_ACCESS_TOKEN_AUDIENCE,
  UKYC_STORAGE_ACCESS_TOKEN_VERSION,
} from './constants';

const LOCAL_USER_SECRET = new Uint8Array(
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
).fill(42);
const MATERIAL = deriveClientMaterial(LOCAL_USER_SECRET);

const ISSUED_AT = new Date('2026-07-07T00:00:00.000Z');
const EXPIRES_AT = new Date('2026-07-07T04:00:00.000Z');

/**
 * Decodes an unpadded base64url string back to bytes.
 *
 * @param value - The base64url string.
 * @returns The decoded bytes.
 */
function fromBase64Url(value: string): Uint8Array {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
  return base64ToBytes(padded.replace(/-/gu, '+').replace(/_/gu, '/'));
}

describe('UKYC canonicalizeJson', () => {
  it('sorts object keys by code unit', () => {
    expect(canonicalizeJson({ b: 1, a: 2, c: 3 })).toBe('{"a":2,"b":1,"c":3}');
  });

  it('preserves array order and emits no whitespace', () => {
    expect(canonicalizeJson({ z: [3, 2, 1], a: 'x' })).toBe(
      '{"a":"x","z":[3,2,1]}',
    );
  });

  it('drops undefined members', () => {
    expect(canonicalizeJson({ a: 1, b: undefined, c: 2 })).toBe(
      '{"a":1,"c":2}',
    );
  });

  it('serializes primitives', () => {
    expect(canonicalizeJson(null)).toBe('null');
    expect(canonicalizeJson(true)).toBe('true');
    expect(canonicalizeJson(false)).toBe('false');
    expect(canonicalizeJson('hi')).toBe('"hi"');
  });

  it('rejects non-integer numbers', () => {
    expect(() => canonicalizeJson(1.5)).toThrow('non-integer');
  });
});

describe('UKYC signStorageAccessToken', () => {
  it('mints a client-presented token with the expected payload', () => {
    const token = signStorageAccessToken({
      material: MATERIAL,
      operations: ['delete'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });

    expect(token.payload).toEqual({
      version: UKYC_STORAGE_ACCESS_TOKEN_VERSION,
      aud: UKYC_STORAGE_ACCESS_TOKEN_AUDIENCE,
      storage_id: expect.stringMatching(/^[A-Za-z0-9_-]+$/u),
      signing_public_key: expect.stringMatching(/^[A-Za-z0-9_-]+$/u),
      operations: ['delete'],
      presenter: 'client',
      issued_at: '2026-07-07T00:00:00.000Z',
      expires_at: '2026-07-07T04:00:00.000Z',
    });
    expect(token.payload).not.toHaveProperty('session_id');
  });

  it('produces a signature that verifies against the signing public key', () => {
    const token = signStorageAccessToken({
      material: MATERIAL,
      operations: ['read', 'write'],
      presenter: 'idos-relay',
      sessionId: 'session-1',
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });

    const message = stringToBytes(canonicalizeJson(token.payload));
    const signature = fromBase64Url(token.signature);

    expect(
      ed25519.verify(signature, message, MATERIAL.signingPublicKey),
    ).toBe(true);
  });

  it('binds session_id for Relay-presented tokens', () => {
    const token = signStorageAccessToken({
      material: MATERIAL,
      operations: ['read'],
      presenter: 'idos-relay',
      sessionId: 'session-42',
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });

    expect(token.payload.session_id).toBe('session-42');
    expect(token.payload.presenter).toBe('idos-relay');
  });

  it('is deterministic for the same inputs', () => {
    const params = {
      material: MATERIAL,
      operations: ['read' as const],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    };

    expect(signStorageAccessToken(params)).toEqual(
      signStorageAccessToken(params),
    );
  });

  it('rejects a Relay presenter without a session_id', () => {
    expect(() =>
      signStorageAccessToken({
        material: MATERIAL,
        operations: ['read'],
        presenter: 'idos-relay',
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toThrow('requires a session_id');
  });

  it('rejects delegating a delete token to the Relay', () => {
    expect(() =>
      signStorageAccessToken({
        material: MATERIAL,
        operations: ['delete'],
        presenter: 'idos-relay',
        sessionId: 'session-1',
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toThrow('cannot be delegated to the Relay');
  });

  it('rejects delete combined with other operations', () => {
    expect(() =>
      signStorageAccessToken({
        material: MATERIAL,
        operations: ['delete', 'read'],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toThrow('must contain only "delete"');
  });

  it('rejects an empty operations list', () => {
    expect(() =>
      signStorageAccessToken({
        material: MATERIAL,
        operations: [],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toThrow('at least one operation');
  });

  it('rejects duplicate operations', () => {
    expect(() =>
      signStorageAccessToken({
        material: MATERIAL,
        operations: ['read', 'read'],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toThrow('must be unique');
  });

  it('rejects an expiry at or before issued_at', () => {
    expect(() =>
      signStorageAccessToken({
        material: MATERIAL,
        operations: ['read'],
        issuedAt: EXPIRES_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toThrow('expires_at must be after issued_at');
  });
});

describe('UKYC encodeStorageAccessTokenForHeader', () => {
  it('encodes the envelope as unpadded base64url that round-trips', () => {
    const token = signStorageAccessToken({
      material: MATERIAL,
      operations: ['read'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });

    const header = encodeStorageAccessTokenForHeader(token);

    expect(header).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(header)))).toEqual(
      token,
    );
  });
});
