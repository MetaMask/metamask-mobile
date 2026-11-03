import { p256 } from '@noble/curves/nist';

import fixture from '../../contracts/v1/fixtures/venue-signing-v2.json';
import { KALSHI_DEMO_SIGNING_PROFILE } from '../venueSigningProfiles';
import {
  contentDigest,
  deviceSigningBase,
  signDeviceRequest,
  type DeviceSigningContext,
} from './deviceRequestSigner';
import type { RenderedRequest } from './venueTemplates';

const { vector } = fixture;
const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';

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

const vectorContext: DeviceSigningContext = {
  a2t: vector.a2t,
  deviceKey: vector.deviceKey,
  salt: vector.salt,
};

const fixtureRequest = (operation: string, index = 0): RenderedRequest => {
  const entry = fixture.cases.find((row) => row.operation === operation);
  if (!entry) {
    throw new Error(`no fixture case ${operation}`);
  }
  return entry.requests[index] as RenderedRequest;
};

describe('deviceSigningBase', () => {
  it('matches the shared fixture vector byte for byte', () => {
    expect(vector.authority).toBe(
      KALSHI_DEMO_SIGNING_PROFILE.implementation.params.authority,
    );

    const base = deviceSigningBase({
      profile: KALSHI_DEMO_SIGNING_PROFILE,
      request: vector.request as RenderedRequest,
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

  it.each(fixture.cases.flatMap((row) => row.requests))(
    'builds the fixture signing base for $name',
    (request) => {
      const params = `(${(request.method === 'GET'
        ? fixture.readComponents
        : fixture.mutationComponents
      )
        .map((component) => `"${component}"`)
        .join(
          ' ',
        )});created=1700000000;expires=1700000060;nonce="${KEY}";tag="kalshi-device-request-v1"`;

      expect(
        deviceSigningBase({
          profile: KALSHI_DEMO_SIGNING_PROFILE,
          request: request as RenderedRequest,
          context: vectorContext,
          requestId: KEY,
          signatureParams: params,
        }),
      ).toBe(request.signingBase);
    },
  );
});

describe('contentDigest', () => {
  it('matches the digest in the shared fixture', () => {
    for (const row of fixture.cases) {
      for (const request of row.requests) {
        if ('digest' in request) {
          expect(contentDigest(request.body)).toBe(request.digest);
        }
      }
    }
  });
});

describe('signDeviceRequest', () => {
  const secretKey = p256.utils.randomSecretKey();
  const publicKey = p256.getPublicKey(secretKey, false);
  const sign = jest.fn(async (message: Uint8Array) =>
    p256.sign(message, secretKey, { prehash: true, lowS: true }).toBytes(),
  );
  const deps = {
    sign,
    requestId: () => KEY,
    now: () => 1_700_000_000,
  };

  it('signs a mutation with the profile authority, body digest and idempotency key', async () => {
    const request = fixtureRequest('onboarding.link');

    const signature = await signDeviceRequest(
      KALSHI_DEMO_SIGNING_PROFILE,
      request,
      vectorContext,
      deps,
    );

    expect(signature).toStrictEqual({
      requestId: KEY,
      signatureInput:
        'kalshi=("@method" "@authority" "@path" "@query" "authorization" "kalshi-device-request-id" "kalshi-device-key" "kalshi-device-key-salt" "content-digest" "content-type" "idempotency-key");created=1700000000;expires=1700000060;nonce="a1b2c3d4-1111-4222-8333-444455556666";tag="kalshi-device-request-v1"',
      signature: expect.stringMatching(/^kalshi=:[A-Za-z0-9+/]+={0,2}:$/u),
    });
    const base = deviceSigningBase({
      profile: KALSHI_DEMO_SIGNING_PROFILE,
      request,
      context: vectorContext,
      requestId: signature.requestId,
      signatureParams: signature.signatureInput.slice('kalshi='.length),
    });
    expect(base).toContain('"@authority": demo-api.kalshi.co');
    expect(base).toContain(`"idempotency-key": ${KEY}`);
    expect(
      p256.verify(
        signatureBytes(signature.signature),
        new TextEncoder().encode(base),
        publicKey,
        { prehash: true },
      ),
    ).toBe(true);
  });

  it('signs a read without body components', async () => {
    const signature = await signDeviceRequest(
      KALSHI_DEMO_SIGNING_PROFILE,
      vector.request as RenderedRequest,
      vectorContext,
      deps,
    );

    expect(signature.signatureInput).toBe(vector.signature.signatureInput);
  });
});
