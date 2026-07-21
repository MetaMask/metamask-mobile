import { deriveClientMaterial } from './deriveClientMaterial';
import { signStorageAccessToken } from './storageAccessToken';
import { buildWrappedRelayPayload } from './wrappedRelayPayload';
import { UKYC_LOCAL_USER_SECRET_SIZE_BYTES } from './constants';

const LOCAL_USER_SECRET = new Uint8Array(
  UKYC_LOCAL_USER_SECRET_SIZE_BYTES,
).fill(42);
const MATERIAL = deriveClientMaterial(LOCAL_USER_SECRET);
const ISSUED_AT = new Date('2026-07-07T00:00:00.000Z');
const EXPIRES_AT = new Date('2026-07-07T04:00:00.000Z');

/**
 * Mints a token with a given presenter/operations for the tests below.
 *
 * @param presenter - The token presenter.
 * @param operations - The token operations.
 * @returns The signed token.
 */
function tokenFor(
  presenter: 'client' | 'idos-relay',
  operations: ('read' | 'write' | 'delete')[],
) {
  return signStorageAccessToken({
    material: MATERIAL,
    operations,
    presenter,
    sessionId: presenter === 'idos-relay' ? 'session-1' : undefined,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
}

describe('UKYC buildWrappedRelayPayload', () => {
  it('bundles the Relay-facing material with the token', () => {
    const token = tokenFor('idos-relay', ['read', 'write']);

    const payload = buildWrappedRelayPayload(MATERIAL, token);

    expect(payload.storage_id).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(payload.data_encryption_key).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(payload.signing_public_key).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(payload.storage_access_token).toBe(token);
  });

  it('shares the data_encryption_key with the Relay', () => {
    const token = tokenFor('idos-relay', ['read']);

    const payload = buildWrappedRelayPayload(MATERIAL, token);

    // The DEK is intentionally included so the Relay can encrypt/decrypt.
    expect(payload.data_encryption_key.length).toBeGreaterThan(0);
  });

  it('never leaks the local secret or private signing key', () => {
    const token = tokenFor('idos-relay', ['read']);

    const payload = buildWrappedRelayPayload(MATERIAL, token);

    expect(Object.keys(payload).sort()).toEqual([
      'data_encryption_key',
      'signing_public_key',
      'storage_access_token',
      'storage_id',
    ]);
  });

  it('rejects a client-presented token', () => {
    const token = tokenFor('client', ['read']);

    expect(() => buildWrappedRelayPayload(MATERIAL, token)).toThrow(
      'requires a Relay-presented storage_access_token',
    );
  });

  it('rejects a delete-scoped token', () => {
    // A delete token cannot be Relay-presented, so craft one that slips past
    // signing by mutating the presenter after the fact.
    const token = tokenFor('client', ['delete']);
    const relayDeleteToken = {
      ...token,
      payload: { ...token.payload, presenter: 'idos-relay' as const },
    };

    expect(() =>
      buildWrappedRelayPayload(MATERIAL, relayDeleteToken),
    ).toThrow('must not carry a delete-scoped storage_access_token');
  });
});
