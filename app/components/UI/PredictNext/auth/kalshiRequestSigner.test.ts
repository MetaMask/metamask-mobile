import { p256 } from '@noble/curves/nist';

import fixture from '../contracts/v1/fixtures/kalshi-signing-v1.json';
import {
  kalshiSigningBase,
  signVenueRequest,
  type KalshiSigningContext,
} from './kalshiRequestSigner';
import { linkRequest } from './signing/kalshiOnboardingTemplates';
import type { VenueRequest } from './signing/venueRequest';

const { vector } = fixture;

const fromBase64Url = (value: string): Uint8Array =>
  new Uint8Array(
    Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/'), 'base64'),
  );

const signatureBytes = (value: string): Uint8Array => {
  const match = /^kalshi=:([A-Za-z0-9+/]+={0,2}):$/u.exec(value);
  if (!match) {
    throw new Error('not a kalshi signature');
  }
  return new Uint8Array(Buffer.from(match[1], 'base64'));
};

const vectorContext: KalshiSigningContext = {
  authority: vector.authority,
  a2t: vector.a2t,
  deviceKey: vector.deviceKey,
  salt: vector.salt,
};

describe('kalshiSigningBase', () => {
  it('matches the shared fixture vector byte for byte', () => {
    const base = kalshiSigningBase({
      request: vector.request as VenueRequest,
      context: vectorContext,
      requestId: vector.signature.requestId,
      signatureParams: vector.signature.signatureInput.slice('kalshi='.length),
    });

    expect(base).toBe(vector.signingBase);
  });

  it('accepts the fixture signature over that base', () => {
    const valid = p256.verify(
      signatureBytes(vector.signature.signature),
      new TextEncoder().encode(vector.signingBase),
      fromBase64Url(vector.deviceKey),
      { prehash: true, lowS: false },
    );

    expect(valid).toBe(true);
  });
});

describe('signVenueRequest', () => {
  const secretKey = p256.utils.randomSecretKey();
  const publicKey = p256.getPublicKey(secretKey, false);
  const sign = jest.fn(async (message: Uint8Array) =>
    p256.sign(message, secretKey, { prehash: true, lowS: true }).toBytes(),
  );
  const deps = {
    sign,
    requestId: () => 'a1b2c3d4-1111-4222-8333-444455556666',
    now: () => 1_700_000_000,
  };

  it('signs a mutation with the body digest and the idempotency key', async () => {
    const request = linkRequest(
      'User+Tag@Example.com',
      'a1b2c3d4-1111-4222-8333-444455556666',
    );

    const signature = await signVenueRequest(request, vectorContext, deps);

    expect(signature).toStrictEqual({
      method: 'POST',
      path: '/trade-api/v2/isv/users/link',
      query: '',
      requestId: 'a1b2c3d4-1111-4222-8333-444455556666',
      signatureInput:
        'kalshi=("@method" "@authority" "@path" "@query" "authorization" "kalshi-device-request-id" "kalshi-device-key" "kalshi-device-key-salt" "content-digest" "content-type" "idempotency-key");created=1700000000;expires=1700000060;nonce="a1b2c3d4-1111-4222-8333-444455556666";tag="kalshi-device-request-v1"',
      signature: expect.stringMatching(/^kalshi=:[A-Za-z0-9+/]+={0,2}:$/u),
      contentDigest: fixture.requests.find((entry) => entry.name === 'link')
        ?.digest,
      idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
    });
    const base = kalshiSigningBase({
      request,
      context: vectorContext,
      requestId: signature.requestId,
      signatureParams: signature.signatureInput.slice('kalshi='.length),
    });
    expect(
      p256.verify(
        signatureBytes(signature.signature),
        new TextEncoder().encode(base),
        publicKey,
        { prehash: true },
      ),
    ).toBe(true);
  });

  it('leaves the body fields off a read', async () => {
    const signature = await signVenueRequest(
      vector.request as VenueRequest,
      vectorContext,
      deps,
    );

    expect(signature).not.toHaveProperty('contentDigest');
    expect(signature).not.toHaveProperty('idempotencyKey');
    expect(signature.signatureInput).toBe(vector.signature.signatureInput);
  });
});
