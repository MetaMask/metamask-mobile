import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

import SecureKeychain from '../../../../core/SecureKeychain';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceMessenger,
} from './PredictDeviceAuthService';
import { KALSHI_AUTHENTICATION_PROFILE } from '../auth/venueAuthProfiles';
import {
  resetVenueProfile,
  setVenueProfileResolverForTesting,
  VenueProfileResolver,
  venueProfileSha256,
} from '../auth/venueSigningProfiles';
import { VENUE_PROFILE_ID } from '../auth/venueProfileContract';
import { RemoteVenueProfileClient } from '../auth/RemoteVenueProfileClient';
import { VenueProfileStore } from '../auth/venueProfileStore';
import {
  BUNDLED_POLICY_RAW,
  BUNDLED_V2_RAW,
  BUNDLED_V3_RAW,
} from '../auth/venue-profiles/kalshi-demo-signing.raw';
import { kalshiDepositSigningInputs } from '../adapters/remote/kalshiDepositSigning';
import type { PredictAmount } from '../types';
import envelope from '../contracts/v1/fixtures/funding-contract/deposit-envelope.json';

/**
 * `funding.deposit` signed by the real Engine signer under the bundled
 * profile, compared with `deposit-envelope.json`. predict-api's own test
 * helper (`signedTradingHeaders`) produced that fixture from the same key,
 * request ID and clock, and predict-api's verifier accepted it. ECDSA here is
 * RFC 6979, so equal inputs give equal bytes.
 */

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../core/SecureKeychain', () => {
  const mock = {
    setSecureItem: jest.fn(),
    getSecureItem: jest.fn(),
    clearSecureScope: jest.fn(),
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    },
  };
  return { __esModule: true, default: mock, ...mock };
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'unpinned'),
}));

const mockEnsureA2t = jest.fn();
jest.mock('../auth/a2tSession', () => ({
  A2tSession: jest.fn().mockImplementation(() => ({
    ensureA2T: mockEnsureA2t,
    clear: jest.fn(),
  })),
}));

const mockDeviceKey = {
  ensure: jest.fn(),
  get: jest.fn(),
  sign: jest.fn(),
};
jest.mock('../auth/p256DeviceKey', () => ({
  createP256DeviceKey: jest.fn(() => ({
    ensure: mockDeviceKey.ensure,
    get: mockDeviceKey.get,
    sign: mockDeviceKey.sign,
    wait: jest.fn(),
    clear: jest.fn(),
    delete: jest.fn(),
    commitment: jest.fn(),
  })),
}));

const SECRET_KEY = sha256(new TextEncoder().encode(envelope.deviceKeySeed));
const PUBLIC_RAW = p256.getPublicKey(SECRET_KEY, false);
const DEVICE = {
  publicRaw: PUBLIC_RAW,
  publicKey: envelope.deviceKey,
  saltRaw: new Uint8Array(Buffer.from(envelope.salt, 'base64url')),
  salt: envelope.salt,
};

const createService = (): PredictDeviceAuthService =>
  new PredictDeviceAuthService(
    {
      registerActionHandler: jest.fn(),
    } as unknown as PredictDeviceAuthServiceMessenger,
    {
      getProfile: () => KALSHI_AUTHENTICATION_PROFILE,
      getIssuerUrl: () => 'https://issuer.example',
      getAccessToken: async () => 'access-token',
      getCanonicalProfileId: () => 'profile-1',
      isEnabled: () => true,
      isUnlocked: () => true,
      isSignedIn: () => true,
      fetch,
      now: () => envelope.created,
      nowMs: () => envelope.created * 1000,
      sleep: async () => undefined,
    },
  );

/** The inputs the Kalshi adapter derives from what the user entered. */
const depositInputs = (
  amount: string,
  amountCents: number,
): ReturnType<typeof kalshiDepositSigningInputs> => {
  const inputs = kalshiDepositSigningInputs(
    {
      amount: amount as PredictAmount,
      clientOperationId: envelope.clientOperationId,
    },
    {
      kind: 'sign_request',
      amountCents,
      clientOperationId: envelope.clientOperationId,
    },
  );
  if (!inputs) {
    throw new Error('no signing inputs');
  }
  return inputs;
};

interface DecodedEnvelope {
  v: number;
  profile: { id: string; version: number; sha256?: string };
  signatures: {
    requestId: string;
    signatureInput: string;
    signature: string;
  }[];
}

const PROFILE_SHA256 = 'SIdWaTHZdPIAQmAhvhmF28N3p6jGHo46kEBLR0L118w';

const decodeEnvelope = (value: string): DecodedEnvelope =>
  JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

beforeEach(() => {
  let ledger: string | null = null;
  jest
    .mocked(SecureKeychain.getSecureItem)
    .mockImplementation(async () =>
      ledger === null ? null : { key: 'approved-intents', value: ledger },
    );
  (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
    async (_account: string, value: string) => {
      ledger = value;
      return true;
    },
  );
  jest.mocked(SecureKeychain.clearSecureScope).mockImplementation(async () => {
    ledger = null;
    return true;
  });
  setVenueProfileResolverForTesting(undefined);
  resetVenueProfile();
  jest.requireMock('uuid').v4.mockReturnValue(envelope.requestId);
  mockEnsureA2t.mockResolvedValue(envelope.a2t);
  mockDeviceKey.ensure.mockResolvedValue(DEVICE);
  mockDeviceKey.get.mockReturnValue(DEVICE);
  mockDeviceKey.sign
    .mockReset()
    .mockImplementation(async (bytes: Uint8Array) =>
      p256
        .sign(bytes, SECRET_KEY, { prehash: true, lowS: true })
        .toBytes('compact'),
    );
});

describe('funding.deposit signing', () => {
  it('produces the backend envelope byte for byte', async () => {
    const signed = await createService().signOperation('funding.deposit', {
      inputs: depositInputs('25.50', 2550),
      confirmed: true,
    });

    expect(signed?.body).toBe(envelope.signedBody);
    expect(signed?.idempotencyKey).toBe(envelope.clientOperationId);
    expect(signed?.header.name).toBe('Venue-Authorization');
    const fixture = decodeEnvelope(envelope.venueAuthorization);
    expect(decodeEnvelope(signed?.header.value ?? '')).toStrictEqual({
      ...fixture,
      profile: { ...fixture.profile, sha256: PROFILE_SHA256 },
    });
  });

  it('signs under profile version 3', async () => {
    const signed = await createService().signOperation('funding.deposit', {
      inputs: depositInputs('25.50', 2550),
      confirmed: true,
    });

    expect(decodeEnvelope(signed?.header.value ?? '').profile).toStrictEqual({
      ...envelope.profile,
      sha256: PROFILE_SHA256,
    });
  });

  it('signs under a profile adopted from the registry', async () => {
    const remote = JSON.stringify({
      ...(JSON.parse(BUNDLED_V3_RAW) as object),
      version: 4,
    });
    const respond = (body: string): Response =>
      ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => body,
      }) as unknown as Response;
    const fetchMock = jest.fn(async (url: string) =>
      respond(
        url.endsWith('/policy.json')
          ? JSON.stringify({
              id: VENUE_PROFILE_ID,
              currentVersion: 4,
              revokedVersions: [1],
            })
          : remote,
      ),
    );
    const resolver = new VenueProfileResolver({
      client: new RemoteVenueProfileClient({
        baseUrl: 'https://client-config.dev-api.cx.metamask.io',
        clientVersion: '7.60.0',
        fetch: fetchMock as unknown as typeof fetch,
      }),
      store: new VenueProfileStore({
        environment: 'test',
        profileId: VENUE_PROFILE_ID,
        storage: {
          getItem: async () => null,
          setItem: async () => undefined,
          removeItem: async () => undefined,
        },
      }),
      bundledPolicyRaw: BUNDLED_POLICY_RAW,
      bundledProfiles: { 2: BUNDLED_V2_RAW, 3: BUNDLED_V3_RAW },
    });
    setVenueProfileResolverForTesting(resolver);
    await resolver.refresh();

    const signed = await createService().signOperation('funding.deposit', {
      inputs: depositInputs('25.50', 2550),
      confirmed: true,
    });

    expect(decodeEnvelope(signed?.header.value ?? '').profile).toStrictEqual({
      id: VENUE_PROFILE_ID,
      version: 4,
      sha256: venueProfileSha256(remote),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('produces a different signature for a changed amount', async () => {
    const service = createService();

    const original = await service.signOperation('funding.deposit', {
      inputs: depositInputs('25.50', 2550),
      confirmed: true,
    });
    const changed = await service.signOperation('funding.deposit', {
      inputs: depositInputs('25.51', 2551),
      confirmed: true,
    });

    expect(changed?.body).toBe('{"amount_cents":2551,"networks":["base"]}');
    const [originalSignature] = decodeEnvelope(
      original?.header.value ?? '',
    ).signatures;
    const [changedSignature] = decodeEnvelope(
      changed?.header.value ?? '',
    ).signatures;
    // Same key, request ID and clock: only the body differs.
    expect(changedSignature.signatureInput).toBe(
      originalSignature.signatureInput,
    );
    expect(changedSignature.signature).not.toBe(originalSignature.signature);
    expect(changed?.header.value).not.toBe(envelope.venueAuthorization);
  });

  it('needs the user confirmation the first time', async () => {
    await expect(
      createService().signOperation('funding.deposit', {
        inputs: depositInputs('25.50', 2550),
      }),
    ).rejects.toMatchObject({ rule: 'confirmation' });
    expect(mockDeviceKey.sign).not.toHaveBeenCalled();
  });

  it('signs the same body again without a new confirmation', async () => {
    const service = createService();
    await service.signOperation('funding.deposit', {
      inputs: depositInputs('25.50', 2550),
      confirmed: true,
    });

    const renewed = await service.signOperation('funding.deposit', {
      inputs: depositInputs('25.50', 2550),
      confirmed: false,
    });

    expect(
      decodeEnvelope(renewed?.header.value ?? '').signatures,
    ).toStrictEqual(decodeEnvelope(envelope.venueAuthorization).signatures);
  });

  it('still signs order.place under the same profile', async () => {
    const signed = await createService().signOperation('order.place', {
      inputs: {
        marketId: 'MKT-1',
        idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        action: 'buy',
        outcome: 'yes',
        amountCents: 5000,
      },
      values: { count: '10.00', price: '0.5000' },
      confirmed: true,
    });

    expect(JSON.parse(signed?.body ?? '{}')).toMatchObject({
      ticker: 'MKT-1',
      client_order_id: 'a1b2c3d4-1111-4222-8333-444455556666',
    });
    expect(decodeEnvelope(signed?.header.value ?? '').profile.version).toBe(3);
  });
});
