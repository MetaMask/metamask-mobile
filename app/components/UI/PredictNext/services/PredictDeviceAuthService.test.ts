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

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const mockGetA2t = jest.fn();
const mockClearSession = jest.fn();
const mockEnsureDeviceKey = jest.fn();
const mockClearDeviceKey = jest.fn();
const mockDeleteDeviceKey = jest.fn();

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
    get: jest.fn(),
    wait: jest.fn(),
    clear: mockClearDeviceKey,
    delete: mockDeleteDeviceKey,
    sign: jest.fn(),
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
}: {
  enabled?: boolean;
  unlocked?: boolean;
  signedIn?: boolean;
  getProfile?: () => VenueAuthenticationProfile | undefined;
  isEnabled?: () => boolean;
  isUnlocked?: () => boolean;
  isSignedIn?: () => boolean;
} = {}) => {
  const registerActionHandler = jest.fn();
  const messenger = {
    registerActionHandler,
  } as unknown as PredictDeviceAuthServiceMessenger;
  const service = new PredictDeviceAuthService(messenger, {
    getProfile,
    getIssuerUrl: () => 'https://issuer.example',
    getAccessToken: async () => 'access-token',
    getCanonicalProfileId: () => 'profile-id',
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
      'PredictDeviceAuthService:prefetch',
      'PredictDeviceAuthService:clear',
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

  it('keeps the local key but skips issuance while signed out', async () => {
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

  it('requests the A2T for the profile resolved before the device key loads', async () => {
    const getProfile = jest.fn(() => KALSHI_AUTHENTICATION_PROFILE);
    const { service } = createService({ getProfile });
    mockEnsureDeviceKey.mockImplementation(async () => {
      getProfile.mockReturnValue(SECOND_AUTHENTICATION_PROFILE);
      return DEVICE_PUBLIC_MATERIAL;
    });

    await expect(service.getA2t()).resolves.toBe('opaque-a2t');

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(createP256DeviceKey).toHaveBeenCalledTimes(1);
    expect(createP256DeviceKey).toHaveBeenCalledWith(
      KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(A2tSession).toHaveBeenCalledTimes(1);
    expect(A2tSession).toHaveBeenCalledWith(
      expect.objectContaining({ profile: KALSHI_AUTHENTICATION_PROFILE }),
    );
    expect(mockGetA2t).toHaveBeenCalledTimes(1);
    expect(mockClearDeviceKey).not.toHaveBeenCalled();
    expect(mockClearSession).not.toHaveBeenCalled();
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

  it('prefetches the A2T for the profile resolved before the device key loads', async () => {
    const getProfile = jest.fn(() => KALSHI_AUTHENTICATION_PROFILE);
    const { service } = createService({ getProfile });
    mockEnsureDeviceKey.mockImplementation(async () => {
      getProfile.mockReturnValue(SECOND_AUTHENTICATION_PROFILE);
      return DEVICE_PUBLIC_MATERIAL;
    });

    await service.prefetch();

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(createP256DeviceKey).toHaveBeenCalledTimes(1);
    expect(createP256DeviceKey).toHaveBeenCalledWith(
      KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(A2tSession).toHaveBeenCalledTimes(1);
    expect(A2tSession).toHaveBeenCalledWith(
      expect.objectContaining({ profile: KALSHI_AUTHENTICATION_PROFILE }),
    );
    expect(mockGetA2t).toHaveBeenCalledTimes(1);
    expect(mockClearDeviceKey).not.toHaveBeenCalled();
    expect(mockClearSession).not.toHaveBeenCalled();
  });
});
