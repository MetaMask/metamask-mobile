import Logger from '../../../../util/Logger';
import {
  PredictDeviceAuthService,
  type PredictDeviceAuthServiceMessenger,
} from './PredictDeviceAuthService';
import { createP256DeviceKey } from '../auth/p256DeviceKey';
import {
  KALSHI_AUTHENTICATION_PROFILE,
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
}: {
  enabled?: boolean;
  unlocked?: boolean;
  signedIn?: boolean;
  getProfile?: () => VenueAuthenticationProfile | undefined;
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
    isEnabled: () => enabled,
    isUnlocked: () => unlocked,
    isSignedIn: () => signedIn,
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
    mockEnsureDeviceKey.mockResolvedValue({
      publicRaw: new Uint8Array(65),
      publicKey: 'public-key',
      saltRaw: new Uint8Array(16),
      salt: 'salt',
    });
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

  it('deletes the persisted key on reset', async () => {
    const { service } = createService();

    await service.reset();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockDeleteDeviceKey).toHaveBeenCalledTimes(1);
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('logs and resolves when deleting the persisted key fails', async () => {
    const { service } = createService();
    mockDeleteDeviceKey.mockRejectedValueOnce(
      new Error('device key delete failed'),
    );

    await expect(service.reset()).resolves.toBeUndefined();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'device key delete failed' }),
      'Failed to reset Predict device authentication',
    );
  });

  it('resolves the profile from getProfile on every capability call', async () => {
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
});
