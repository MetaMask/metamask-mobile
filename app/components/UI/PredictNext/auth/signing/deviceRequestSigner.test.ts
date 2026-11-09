import { p256 } from '@noble/curves/nist';

import { loadVenueProfile } from '../venueSigningProfiles';
import {
  contentDigest,
  deviceSigningBase,
  signDeviceRequest,
  type DeviceSigningContext,
} from './deviceRequestSigner';
import type { RenderedRequest, SigningProfile } from '../venueSigningProfiles';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';

const signatureBytes = (value: string): Uint8Array => {
  const match = /^kalshi=:([A-Za-z0-9+/]+={0,2}):$/u.exec(value);
  if (!match) {
    throw new Error('not a kalshi signature');
  }
  return new Uint8Array(Buffer.from(match[1], 'base64'));
};

// The bundled trading profile; `loadVenueProfile` verifies it.
let profile: SigningProfile;

beforeAll(async () => {
  profile = (await loadVenueProfile()) as SigningProfile;
});

const context: DeviceSigningContext = {
  a2t: 'test-a2t-token',
  deviceKey: 'ZGV2aWNlLWtleQ',
  salt: 'c2FsdA',
};

const orderRequest: RenderedRequest = {
  name: 'create_order',
  class: 'mutation',
  method: 'POST',
  path: '/trade-api/v2/portfolio/events/orders',
  query: '',
  body: '{"ticker":"MKT"}',
  idempotencyKey: KEY,
};

const readRequest: RenderedRequest = {
  name: 'balance',
  class: 'read',
  method: 'GET',
  path: '/trade-api/v2/portfolio/balance',
  query: '',
  body: '',
};

const signatureParamsRead =
  '("@method" "@authority" "@path" "@query" "authorization" "kalshi-device-request-id" "kalshi-device-key" "kalshi-device-key-salt");created=1700000000;expires=1700000060;nonce="a1b2c3d4-1111-4222-8333-444455556666";tag="kalshi-device-request-v1"';

describe('deviceSigningBase', () => {
  it('covers the read components in profile order', () => {
    const base = deviceSigningBase({
      profile,
      request: readRequest,
      context,
      requestId: KEY,
      signatureParams: signatureParamsRead,
    });

    expect(base).toBe(
      [
        '"@method": GET',
        '"@authority": demo-api.kalshi.co',
        '"@path": /trade-api/v2/portfolio/balance',
        '"@query": ?',
        `"authorization": Kalshi-A2T ${context.a2t}`,
        `"kalshi-device-request-id": ${KEY}`,
        `"kalshi-device-key": ${context.deviceKey}`,
        `"kalshi-device-key-salt": ${context.salt}`,
        `"@signature-params": ${signatureParamsRead}`,
      ].join('\n'),
    );
  });

  it('adds body components for a mutation', () => {
    const base = deviceSigningBase({
      profile,
      request: orderRequest,
      context,
      requestId: KEY,
      signatureParams: '(...) ;placeholder',
    });

    expect(base).toContain('"content-digest": sha-256=:');
    expect(base).toContain('"content-type": application/json');
    expect(base).toContain(`"idempotency-key": ${KEY}`);
    expect(base).toContain('"@path": /trade-api/v2/portfolio/events/orders');
  });
});

describe('contentDigest', () => {
  it('is the RFC 9530 sha-256 digest of the exact bytes', () => {
    expect(contentDigest('{"ticker":"MKT"}')).toBe(
      contentDigest('{"ticker":"MKT"}'),
    );
    expect(contentDigest('')).toMatch(/^sha-256=:[A-Za-z0-9+/]+={0,2}:$/u);
    expect(contentDigest('a')).not.toBe(contentDigest('b'));
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
    const signature = await signDeviceRequest(
      profile,
      orderRequest,
      context,
      deps,
    );

    expect(signature.requestId).toBe(KEY);
    expect(signature.signatureInput).toBe(
      'kalshi=("@method" "@authority" "@path" "@query" "authorization" "kalshi-device-request-id" "kalshi-device-key" "kalshi-device-key-salt" "content-digest" "content-type" "idempotency-key");created=1700000000;expires=1700000060;nonce="a1b2c3d4-1111-4222-8333-444455556666";tag="kalshi-device-request-v1"',
    );
    expect(signature.signature).toMatch(/^kalshi=:[A-Za-z0-9+/]+={0,2}:$/u);

    const base = deviceSigningBase({
      profile,
      request: orderRequest,
      context,
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

  it('signs a read without body components', async () => {
    const signature = await signDeviceRequest(
      profile,
      readRequest,
      context,
      deps,
    );

    expect(signature.signatureInput).toBe(
      'kalshi=("@method" "@authority" "@path" "@query" "authorization" "kalshi-device-request-id" "kalshi-device-key" "kalshi-device-key-salt");created=1700000000;expires=1700000060;nonce="a1b2c3d4-1111-4222-8333-444455556666";tag="kalshi-device-request-v1"',
    );
    expect(signature.signature).toMatch(/^kalshi=:/u);
  });
});
