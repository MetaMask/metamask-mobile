import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceMessenger,
} from './PredictDeviceAuthService';
import { A2tSession } from '../auth/a2tSession';
import { createP256DeviceKey } from '../auth/p256DeviceKey';
import {
  KALSHI_AUTHENTICATION_PROFILE,
  listBundledAuthenticationProfiles,
  type VenueAuthenticationProfile,
} from '../auth/venueAuthProfiles';
import { resetVenueProfile } from '../auth/venueSigningProfiles';
import { TemplateError } from '../auth/signing/profileTemplates';

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

const mockGetA2t = jest.fn();
const mockClearSession = jest.fn();
const mockEnsureDeviceKey = jest.fn();
const mockClearDeviceKey = jest.fn();
const mockDeleteDeviceKey = jest.fn();
const mockSignDeviceKey = jest.fn();
const mockGetDeviceKey = jest.fn();

jest.mock('../auth/a2tSession', () => ({
  A2tSession: jest.fn().mockImplementation(() => ({
    ensureA2T: mockGetA2t,
    clear: mockClearSession,
  })),
}));

jest.mock('../auth/venueAuthProfiles', () => {
  const actual = jest.requireActual('../auth/venueAuthProfiles');
  return {
    ...actual,
    listBundledAuthenticationProfiles: jest.fn(() => [
      actual.KALSHI_AUTHENTICATION_PROFILE,
    ]),
  };
});

jest.mock('../auth/p256DeviceKey', () => ({
  createP256DeviceKey: jest.fn(() => ({
    ensure: mockEnsureDeviceKey,
    get: mockGetDeviceKey,
    wait: jest.fn(),
    clear: mockClearDeviceKey,
    delete: mockDeleteDeviceKey,
    sign: mockSignDeviceKey,
    commitment: jest.fn(),
  })),
}));

const DEVICE_PUBLIC_MATERIAL = {
  publicRaw: new Uint8Array(65),
  publicKey: 'public-key',
  saltRaw: new Uint8Array(16),
  salt: 'salt',
};

const SECOND_AUTHENTICATION_PROFILE: VenueAuthenticationProfile = {
  ...KALSHI_AUTHENTICATION_PROFILE,
  id: 'second-a2t-v1',
  deviceKey: {
    ...KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    keySlot: 'second-v1',
  },
};

const createService = ({
  enabled = true,
  unlocked = true,
  signedIn = true,
  getProfile = () => KALSHI_AUTHENTICATION_PROFILE,
  isEnabled = () => enabled,
  isUnlocked = () => unlocked,
  isSignedIn = () => signedIn,
  getCanonicalProfileId = () => 'profile-id',
}: {
  enabled?: boolean;
  unlocked?: boolean;
  signedIn?: boolean;
  getProfile?: () => VenueAuthenticationProfile | undefined;
  isEnabled?: () => boolean;
  isUnlocked?: () => boolean;
  isSignedIn?: () => boolean;
  getCanonicalProfileId?: () => string | undefined;
} = {}) => {
  const registerActionHandler = jest.fn();
  const messenger = {
    registerActionHandler,
  } as unknown as PredictDeviceAuthServiceMessenger;
  const service = new PredictDeviceAuthService(messenger, {
    getProfile,
    getIssuerUrl: () => 'https://issuer.example',
    getAccessToken: async () => 'access-token',
    getCanonicalProfileId,
    getSrpIdentifier: async () => 'srp-id',
    signSrpMessage: async () => 'signature',
    isEnabled,
    isUnlocked,
    isSignedIn,
    fetch,
    now: () => 1_700_000_000,
    nowMs: () => 0,
    sleep: async () => undefined,
  });
  return { service, registerActionHandler };
};

// The mobile TypeScript library target is ES2022, before Promise.withResolvers.
const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

beforeEach(() => {
  let ledger: string | null = null;
  mockGetDeviceKey.mockReset().mockReturnValue(DEVICE_PUBLIC_MATERIAL);
  mockSignDeviceKey.mockReset().mockResolvedValue(new Uint8Array(64).fill(7));
  mockEnsureDeviceKey.mockReset().mockResolvedValue(DEVICE_PUBLIC_MATERIAL);
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
});

describe('PredictDeviceAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(listBundledAuthenticationProfiles)
      .mockReturnValue([KALSHI_AUTHENTICATION_PROFILE]);
    mockEnsureDeviceKey.mockResolvedValue(DEVICE_PUBLIC_MATERIAL);
    mockGetA2t.mockResolvedValue('opaque-a2t');
  });

  it('registers only capability-scoped actions', () => {
    const { registerActionHandler } = createService();

    expect(registerActionHandler.mock.calls.map(([type]) => type)).toEqual([
      'PredictDeviceAuthService:ensureDeviceKey',
      'PredictDeviceAuthService:getA2t',
      'PredictDeviceAuthService:signOperation',
      'PredictDeviceAuthService:previewOperation',
      'PredictDeviceAuthService:getApprovalGeneration',
      'PredictDeviceAuthService:signRead',
      'PredictDeviceAuthService:prefetch',
      'PredictDeviceAuthService:invalidateA2t',
      'PredictDeviceAuthService:clear',
      'PredictDeviceAuthService:clearApprovals',
      'PredictDeviceAuthService:reset',
    ]);
  });

  it('returns an A2T after preparing the device key', async () => {
    const { service } = createService();

    await expect(service.getA2t()).resolves.toBe('opaque-a2t');

    expect(mockEnsureDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockGetA2t).toHaveBeenCalledTimes(1);
  });

  it('clears plaintext and skips issuance when disabled', async () => {
    const { service } = createService({ enabled: false });

    await expect(service.getA2t()).resolves.toBeUndefined();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockClearDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockGetA2t).not.toHaveBeenCalled();
  });

  it('clears the session and plaintext key while signed out', async () => {
    const { service } = createService({ signedIn: false });

    await expect(service.getA2t()).resolves.toBeUndefined();

    expect(mockEnsureDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockGetA2t).not.toHaveBeenCalled();
  });

  it('deletes every bundled key slot when no profile is selected', async () => {
    jest
      .mocked(listBundledAuthenticationProfiles)
      .mockReturnValue([
        KALSHI_AUTHENTICATION_PROFILE,
        SECOND_AUTHENTICATION_PROFILE,
      ]);
    const getProfile = jest.fn(
      (): VenueAuthenticationProfile | undefined => undefined,
    );
    const { service } = createService({ getProfile });

    await service.reset();

    expect(getProfile).not.toHaveBeenCalled();
    expect(createP256DeviceKey).toHaveBeenNthCalledWith(
      1,
      KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(createP256DeviceKey).toHaveBeenNthCalledWith(
      2,
      SECOND_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(mockDeleteDeviceKey).toHaveBeenCalledTimes(2);
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('deletes every bundled key slot when the selected profile is one of them', async () => {
    jest
      .mocked(listBundledAuthenticationProfiles)
      .mockReturnValue([
        KALSHI_AUTHENTICATION_PROFILE,
        SECOND_AUTHENTICATION_PROFILE,
      ]);
    const getProfile = jest.fn(() => KALSHI_AUTHENTICATION_PROFILE);
    const { service } = createService({ getProfile });
    await service.ensureDeviceKey();
    getProfile.mockClear();
    jest.mocked(createP256DeviceKey).mockClear();
    mockDeleteDeviceKey.mockClear();
    mockClearSession.mockClear();

    await service.reset();

    expect(getProfile).not.toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockClearDeviceKey).toHaveBeenCalledTimes(1);
    expect(createP256DeviceKey).toHaveBeenNthCalledWith(
      1,
      KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(createP256DeviceKey).toHaveBeenNthCalledWith(
      2,
      SECOND_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(mockDeleteDeviceKey).toHaveBeenCalledTimes(2);
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('deletes the remaining key slots when one delete fails', async () => {
    jest
      .mocked(listBundledAuthenticationProfiles)
      .mockReturnValue([
        KALSHI_AUTHENTICATION_PROFILE,
        SECOND_AUTHENTICATION_PROFILE,
      ]);
    const { service } = createService();
    mockDeleteDeviceKey.mockRejectedValueOnce(
      new Error('device key delete failed'),
    );

    await expect(service.reset()).resolves.toBeUndefined();

    expect(mockDeleteDeviceKey).toHaveBeenCalledTimes(2);
    expect(createP256DeviceKey).toHaveBeenNthCalledWith(
      2,
      SECOND_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'device key delete failed' }),
      'Failed to reset Predict device authentication',
    );
  });

  it('resolves the profile from getProfile when preparing an A2T', async () => {
    const getProfile = jest.fn(() => KALSHI_AUTHENTICATION_PROFILE);
    const { service } = createService({ getProfile });

    await service.getA2t();

    expect(getProfile).toHaveBeenCalled();
  });

  it('does not create a device key when no profile is configured', async () => {
    const { service } = createService({ getProfile: () => undefined });

    await expect(service.ensureDeviceKey()).resolves.toBeNull();

    expect(createP256DeviceKey).not.toHaveBeenCalled();
    expect(mockEnsureDeviceKey).not.toHaveBeenCalled();
  });

  it('rebuilds the device key and session when the resolved profile id changes', async () => {
    let profile: VenueAuthenticationProfile = KALSHI_AUTHENTICATION_PROFILE;
    const { service } = createService({ getProfile: () => profile });

    await service.ensureDeviceKey();
    expect(createP256DeviceKey).toHaveBeenCalledTimes(1);
    expect(createP256DeviceKey).toHaveBeenLastCalledWith(
      KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    );

    profile = SECOND_AUTHENTICATION_PROFILE;
    await service.ensureDeviceKey();

    expect(createP256DeviceKey).toHaveBeenCalledTimes(2);
    expect(createP256DeviceKey).toHaveBeenLastCalledWith(
      SECOND_AUTHENTICATION_PROFILE.deviceKey,
    );
    // Switching profiles must clear the outgoing key's plaintext.
    expect(mockClearDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('reuses the existing device key and session when the resolved profile id is unchanged', async () => {
    const { service } = createService();

    await service.ensureDeviceKey();
    await service.ensureDeviceKey();

    expect(createP256DeviceKey).toHaveBeenCalledTimes(1);
  });

  it('refuses issuance for a profile replaced while the device key loads', async () => {
    const getProfile = jest.fn(() => KALSHI_AUTHENTICATION_PROFILE);
    const { service } = createService({ getProfile });
    mockEnsureDeviceKey.mockImplementationOnce(async () => {
      getProfile.mockReturnValue(SECOND_AUTHENTICATION_PROFILE);
      return DEVICE_PUBLIC_MATERIAL;
    });

    await expect(service.getA2t()).resolves.toBeUndefined();

    expect(mockGetA2t).not.toHaveBeenCalled();
    expect(mockClearDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    await expect(service.getA2t()).resolves.toBe('opaque-a2t');
    expect(A2tSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ profile: SECOND_AUTHENTICATION_PROFILE }),
    );
  });

  it.each(['getA2t', 'prefetch'] as const)(
    '%s skips A2T issuance when the wallet locks during device key loading',
    async (method) => {
      let unlocked = true;
      const { service } = createService({ isUnlocked: () => unlocked });
      mockEnsureDeviceKey.mockImplementation(async () => {
        unlocked = false;
        service.clear();
        return DEVICE_PUBLIC_MATERIAL;
      });

      await expect(service[method]()).resolves.toBeUndefined();

      expect(mockGetA2t).not.toHaveBeenCalled();
    },
  );

  it.each(['getA2t', 'prefetch'] as const)(
    '%s skips A2T issuance when Predict auth is disabled during device key loading',
    async (method) => {
      let enabled = true;
      const { service } = createService({ isEnabled: () => enabled });
      mockEnsureDeviceKey.mockImplementation(async () => {
        enabled = false;
        service.clear();
        return DEVICE_PUBLIC_MATERIAL;
      });

      await expect(service[method]()).resolves.toBeUndefined();

      expect(mockGetA2t).not.toHaveBeenCalled();
    },
  );

  it('does not prefetch for a profile replaced while the device key loads', async () => {
    const getProfile = jest.fn(() => KALSHI_AUTHENTICATION_PROFILE);
    const { service } = createService({ getProfile });
    mockEnsureDeviceKey.mockImplementationOnce(async () => {
      getProfile.mockReturnValue(SECOND_AUTHENTICATION_PROFILE);
      return DEVICE_PUBLIC_MATERIAL;
    });

    await service.prefetch();

    expect(mockGetA2t).not.toHaveBeenCalled();
    expect(mockClearDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });
});

describe('PredictDeviceAuthService.signOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetVenueProfile();
    mockEnsureDeviceKey.mockResolvedValue(DEVICE_PUBLIC_MATERIAL);
    mockGetA2t.mockResolvedValue('opaque-a2t');
  });

  it('returns the envelope header plus the exact create_order body bytes', async () => {
    const { service } = createService();

    const signed = await service.signOperation('order.place', {
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

    expect(signed).toBeDefined();
    expect(signed?.header.name).toBe('Venue-Authorization');
    // The header value is the base64 v1 envelope document.
    expect(signed?.header.value).toEqual(expect.stringContaining('eyJ2Ijox'));
    expect(signed?.idempotencyKey).toBe('a1b2c3d4-1111-4222-8333-444455556666');
    const body = JSON.parse(signed?.body ?? '{}');
    expect(body).toEqual({
      ticker: 'MKT-1',
      client_order_id: 'a1b2c3d4-1111-4222-8333-444455556666',
      side: 'bid',
      count: '10.00',
      price: '0.5000',
      time_in_force: 'immediate_or_cancel',
      self_trade_prevention_type: 'taker_at_cross',
      reduce_only: false,
    });
  });

  it('signs exactly the profile payload: no field the profile does not render', async () => {
    const { service } = createService();

    const signed = await service.signOperation('order.place', {
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

    expect(Object.keys(JSON.parse(signed?.body ?? '{}'))).toEqual([
      'ticker',
      'client_order_id',
      'side',
      'count',
      'price',
      'time_in_force',
      'self_trade_prevention_type',
      'reduce_only',
    ]);
  });

  it.each([
    [
      'a path outside the allowlist',
      '/trade-api/v2/portfolio/events/orders',
      '',
    ],
    ['a dot segment', '/trade-api/v2/portfolio/orders/..', ''],
    [
      'a line break in the query',
      '/trade-api/v2/portfolio/balance',
      'a=1\nb=2',
    ],
    [
      'an oversized query',
      '/trade-api/v2/portfolio/balance',
      'a='.padEnd(2100, 'x'),
    ],
  ])('refuses to sign a proposed read with %s', async (_label, path, query) => {
    const { service } = createService();

    await expect(
      service.signRead({ method: 'GET', path, query }),
    ).rejects.toMatchObject({ name: 'TemplateError', rule: 'class' });
  });

  it.each(['not-a-uuid', 'a1b2c3d4-1111-1222-8333-444455556666'])(
    'refuses a read challenge that is not UUID v4: %s',
    async (requestId) => {
      const { service } = createService();

      await expect(
        service.signRead({
          method: 'GET',
          path: '/trade-api/v2/portfolio/orders',
          query: '',
          requestId,
        }),
      ).rejects.toMatchObject({ name: 'TemplateError', rule: 'input' });
      expect(mockEnsureDeviceKey).not.toHaveBeenCalled();
    },
  );

  it('returns undefined when signing is not available', async () => {
    const { service } = createService({ enabled: false });

    await expect(
      service.signOperation('order.place', {
        inputs: {
          marketId: 'MKT-1',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          action: 'buy',
          outcome: 'yes',
          amountCents: 5000,
        },
        values: { count: '10.00', price: '0.5000' },
      }),
    ).resolves.toBeUndefined();
  });

  it('refuses intents the profile does not declare', async () => {
    const { service } = createService();

    await expect(
      service.signOperation('order.cancel', {}),
    ).rejects.toMatchObject({ name: 'TemplateError', rule: 'intent' });
  });

  it('keeps previewOperation rendering without an overlay', async () => {
    const { service } = createService();

    const display = await service.previewOperation('order.place', {
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

    expect(display).toEqual({
      maxCost: '5.20',
      minProceeds: '4.80',
      payout: '10.00',
      contracts: '10.00',
    });
  });
});

describe('PredictDeviceAuthService.signOperation availability guards', () => {
  const ORDER = {
    inputs: {
      marketId: 'MKT-1',
      idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
      action: 'buy' as const,
      outcome: 'yes' as const,
      amountCents: 5000,
    },
    values: { count: '10.00', price: '0.5000' },
    confirmed: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetVenueProfile();
    mockEnsureDeviceKey.mockResolvedValue(DEVICE_PUBLIC_MATERIAL);
    mockGetA2t.mockResolvedValue('opaque-a2t');
  });

  it('returns undefined when the A2T is unavailable', async () => {
    mockGetA2t.mockResolvedValueOnce(undefined);
    const { service } = createService();

    await expect(
      service.signOperation('order.place', ORDER),
    ).resolves.toBeUndefined();
  });

  it('clears the session when the user signs out while the key loads', async () => {
    let signedIn = true;
    mockEnsureDeviceKey.mockImplementationOnce(async () => {
      signedIn = false;
      return DEVICE_PUBLIC_MATERIAL;
    });
    const { service } = createService({ isSignedIn: () => signedIn });

    await expect(
      service.signOperation('order.place', ORDER),
    ).resolves.toBeUndefined();
    expect(mockClearSession).toHaveBeenCalled();
  });

  it('returns undefined when the device key never loads', async () => {
    mockEnsureDeviceKey.mockResolvedValueOnce(null);
    const { service } = createService();

    await expect(
      service.signOperation('order.place', ORDER),
    ).resolves.toBeUndefined();
  });

  it('refuses an unconfirmed intent before it signs anything', async () => {
    const { service } = createService();

    // `claimIntentSignature` is the only guard that reads the confirmation
    // flag, so this proves the service consults it rather than defaulting.
    await expect(
      service.signOperation('order.place', { ...ORDER, confirmed: false }),
    ).rejects.toMatchObject({ name: 'TemplateError', rule: 'confirmation' });
  });
});

describe('PredictDeviceAuthService revocation races', () => {
  const order = {
    inputs: {
      marketId: 'MKT-1',
      idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
      action: 'buy' as const,
      outcome: 'yes' as const,
      amountCents: 5000,
    },
    values: { count: '10.00', price: '0.5000' },
    confirmed: true,
  };
  const read = {
    method: 'GET' as const,
    path: '/trade-api/v2/portfolio/orders',
    query: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetVenueProfile();
    mockGetA2t.mockResolvedValue('opaque-a2t');
  });

  it.each(['first claim', 'renewal'] as const)(
    'refuses a %s when lock and unlock happen during its ledger write',
    async (phase) => {
      let unlocked = true;
      const { service } = createService({ isUnlocked: () => unlocked });
      if (phase === 'renewal') {
        await service.signOperation('order.place', order);
      }
      mockSignDeviceKey.mockClear();
      const started = deferred<void>();
      const write = deferred<boolean>();
      (SecureKeychain.setSecureItem as jest.Mock).mockImplementationOnce(() => {
        started.resolve();
        return write.promise;
      });
      const pending = service.signOperation('order.place', {
        ...order,
        confirmed: phase === 'first claim',
      });
      await started.promise;
      const refused =
        await expect(pending).rejects.toBeInstanceOf(TemplateError);
      unlocked = false;
      const cleared = service.clearApprovals();
      unlocked = true;
      write.resolve(true);

      await refused;
      await cleared;
      expect(mockSignDeviceKey).not.toHaveBeenCalled();
      await expect(
        service.signOperation('order.place', { ...order, confirmed: false }),
      ).rejects.toMatchObject({ rule: 'confirmation' });
      await expect(
        service.signOperation('order.place', order),
      ).resolves.toBeDefined();
    },
  );

  it('revokes synchronously when reset waits on an approval write', async () => {
    const { service } = createService();
    const started = deferred<void>();
    const write = deferred<boolean>();
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementationOnce(() => {
      started.resolve();
      return write.promise;
    });
    const pending = service.signOperation('order.place', order);
    await started.promise;
    const refused = await expect(pending).rejects.toBeInstanceOf(TemplateError);
    mockClearDeviceKey.mockClear();
    mockClearSession.mockClear();
    const reset = service.reset();

    expect(mockClearDeviceKey).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockDeleteDeviceKey).toHaveBeenCalled();
    await expect(service.ensureDeviceKey()).resolves.toBeNull();
    write.resolve(true);
    await refused;
    await reset;
    expect(mockSignDeviceKey).not.toHaveBeenCalled();
    await expect(
      service.signOperation('order.place', order),
    ).resolves.toBeDefined();
  });

  it.each(['operation', 'read'] as const)(
    'refuses %s signing after lock and unlock during key loading',
    async (lane) => {
      const key = deferred<typeof DEVICE_PUBLIC_MATERIAL>();
      const started = deferred<void>();
      mockEnsureDeviceKey.mockImplementationOnce(() => {
        started.resolve();
        return key.promise;
      });
      const { service } = createService();
      const pending =
        lane === 'operation'
          ? service.signOperation('order.place', order)
          : service.signRead(read);
      await started.promise;
      await service.clearApprovals();
      key.resolve(DEVICE_PUBLIC_MATERIAL);

      await expect(pending).resolves.toBeUndefined();
      expect(mockGetA2t).not.toHaveBeenCalled();
      expect(mockSignDeviceKey).not.toHaveBeenCalled();
    },
  );

  it.each(['operation', 'read'] as const)(
    'refuses %s signing after revocation during A2T preparation',
    async (lane) => {
      const a2t = deferred<string>();
      const started = deferred<void>();
      mockGetA2t.mockImplementationOnce(() => {
        started.resolve();
        return a2t.promise;
      });
      const { service } = createService();
      const pending =
        lane === 'operation'
          ? service.signOperation('order.place', order)
          : service.signRead(read);
      await started.promise;
      await service.clearApprovals();
      a2t.resolve('revoked-a2t');

      await expect(pending).resolves.toBeUndefined();
      expect(mockSignDeviceKey).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['operation', 'lock'],
    ['read', 'lock'],
    ['operation', 'reset'],
    ['read', 'reset'],
  ] as const)(
    'drops a completed %s signature after %s during crypto',
    async (lane, boundary) => {
      const signature = deferred<Uint8Array>();
      const started = deferred<void>();
      mockSignDeviceKey.mockImplementationOnce(() => {
        started.resolve();
        return signature.promise;
      });
      const { service } = createService();
      const pending =
        lane === 'operation'
          ? service.signOperation('order.place', order)
          : service.signRead(read);
      await started.promise;
      if (boundary === 'reset') {
        await service.reset();
      } else {
        await service.clearApprovals();
      }
      signature.resolve(new Uint8Array(64).fill(7));

      await expect(pending).resolves.toBeUndefined();
      await expect(service.signRead(read)).resolves.toBeDefined();
    },
  );

  it.each(['identity', 'profile', 'key'] as const)(
    'drops an envelope when its %s snapshot changes during crypto',
    async (replacement) => {
      let identity = 'original-identity';
      let profile = KALSHI_AUTHENTICATION_PROFILE;
      const { service } = createService({
        getCanonicalProfileId: () => identity,
        getProfile: () => profile,
      });
      const signature = deferred<Uint8Array>();
      const started = deferred<void>();
      mockSignDeviceKey.mockImplementationOnce(() => {
        started.resolve();
        return signature.promise;
      });
      const pending = service.signRead(read);
      await started.promise;
      if (replacement === 'identity') {
        identity = 'new-identity';
      } else if (replacement === 'profile') {
        profile = SECOND_AUTHENTICATION_PROFILE;
      } else {
        mockGetDeviceKey.mockReturnValue({
          ...DEVICE_PUBLIC_MATERIAL,
          publicKey: 'replacement-key',
        });
      }
      signature.resolve(new Uint8Array(64).fill(7));

      await expect(pending).resolves.toBeUndefined();
    },
  );

  it('does not return a key from an ensure that predates reset', async () => {
    const key = deferred<typeof DEVICE_PUBLIC_MATERIAL>();
    const started = deferred<void>();
    mockEnsureDeviceKey.mockImplementationOnce(() => {
      started.resolve();
      return key.promise;
    });
    const { service } = createService();
    const pending = service.ensureDeviceKey();
    await started.promise;
    await service.reset();
    key.resolve(DEVICE_PUBLIC_MATERIAL);

    await expect(pending).resolves.toBeNull();
    await expect(service.ensureDeviceKey()).resolves.toEqual(
      DEVICE_PUBLIC_MATERIAL,
    );
  });

  it('retains quote approval across A2T renewal but refuses it after a lifecycle clear', async () => {
    const { service } = createService();
    const approvalGeneration = service.getApprovalGeneration();
    const input = { ...order, approvalGeneration };
    service.invalidateA2t();

    await expect(
      service.previewOperation('order.place', input),
    ).resolves.toBeDefined();
    expect(service.getApprovalGeneration()).toBe(approvalGeneration);
    service.clear();

    await expect(
      service.previewOperation('order.place', input),
    ).resolves.toBeUndefined();
    await expect(
      service.signOperation('order.place', input),
    ).resolves.toBeUndefined();
    expect(mockSignDeviceKey).not.toHaveBeenCalled();
  });
});
