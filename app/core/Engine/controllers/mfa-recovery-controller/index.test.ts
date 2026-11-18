import {
  AuthApiRecoveryAuthProvider,
  RecoveryRegistrationLockProvider,
  UserStorageTrustedIdentifierStore,
} from '@metamask/mfa-recovery-controller';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
import { isMfaRecoveryConfigured } from './config';
import { createMfaRecoveryController } from './create-mfa-recovery-controller';
import { mfaRecoveryControllerInit } from './index';

jest.mock('../../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: { resultFunc: jest.fn() },
}));

jest.mock('./config', () => ({
  getRegistrationUrl: () => 'https://registration.test',
  isMfaRecoveryConfigured: jest.fn(),
}));

jest.mock('./create-mfa-recovery-controller', () => ({
  createMfaRecoveryController: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/passkeyAdapter', () => ({
  mobilePasskeyAdapter: { get: jest.fn() },
}));

jest.mock('@metamask/messenger', () => ({
  Messenger: jest.fn(() => ({ kind: 'store' })),
}));

jest.mock('@metamask/mfa-recovery-controller', () => ({
  AuthApiRecoveryAuthProvider: jest.fn(),
  RecoveryRegistrationLockProvider: jest.fn(),
  UserStorageTrustedIdentifierStore: jest.fn(),
}));

const mockCreate = jest.mocked(createMfaRecoveryController);
const mockSelectEnabled = jest.mocked(selectMfaRecoveryEnabled.resultFunc);
const mockIsConfigured = jest.mocked(isMfaRecoveryConfigured);

describe('mfaRecoveryControllerInit', () => {
  const controller = { name: 'MfaRecoveryController' };
  const controllerMessenger = { kind: 'controller' };
  const initMessenger = {
    call: jest.fn(),
    delegate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReturnValue(controller as never);
    mockSelectEnabled.mockReturnValue(true);
    mockIsConfigured.mockReturnValue(true);
  });

  it('creates the controller with pendingOperation cleared from persisted state', () => {
    const { controller: created } = mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {
        MfaRecoveryController: {
          pendingOperation: { encrypted: true },
          other: 'keep',
        },
      },
    } as never);

    expect(created).toBe(controller);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: controllerMessenger,
        state: { pendingOperation: null, other: 'keep' },
      }),
    );
  });

  it('keeps trusted identifiers in user storage', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);

    expect(initMessenger.delegate).toHaveBeenCalledWith({
      actions: [
        'UserStorageController:performGetStorageAllFeatureEntries',
        'UserStorageController:performSetStorage',
        'UserStorageController:performDeleteStorage',
      ],
      messenger: { kind: 'store' },
    });
    expect(UserStorageTrustedIdentifierStore).toHaveBeenCalledWith({
      messenger: { kind: 'store' },
    });
    expect(mockCreate.mock.calls[0][0].trustedIdentifierStore).toBe(
      jest.mocked(UserStorageTrustedIdentifierStore).mock.instances[0],
    );
  });

  it('wires the Auth API approvals and the registration service lock', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);
    const options = mockCreate.mock.calls[0][0];

    expect(initMessenger.delegate).toHaveBeenCalledWith({
      actions: [
        'AuthenticationController:refreshCanonicalProfileId',
        'AuthenticationController:requestMfaApproval',
      ],
      messenger: { kind: 'store' },
    });
    expect(initMessenger.delegate).toHaveBeenCalledWith({
      actions: [
        'AuthenticationController:getBearerToken',
        'AuthenticationController:refreshCanonicalProfileId',
      ],
      messenger: { kind: 'store' },
    });
    expect(options.authProvider).toBe(
      jest.mocked(AuthApiRecoveryAuthProvider).mock.instances[0],
    );
    expect(RecoveryRegistrationLockProvider).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://registration.test' }),
    );
    expect(options.lockProvider).toBe(
      jest.mocked(RecoveryRegistrationLockProvider).mock.instances[0],
    );
  });

  it('passes undefined state when nothing was persisted', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ state: undefined }),
    );
  });

  it('enables recovery only when the flag and configuration are both ready', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);
    const { isEnabled } = mockCreate.mock.calls[0][0];
    initMessenger.call.mockReturnValue({
      remoteFeatureFlags: { mfaRecovery: { enabled: true } },
    });

    expect(isEnabled()).toBe(true);
    expect(mockSelectEnabled).toHaveBeenCalledWith({
      mfaRecovery: { enabled: true },
    });
    expect(mockIsConfigured).toHaveBeenCalledTimes(1);

    mockSelectEnabled.mockReturnValue(false);
    expect(isEnabled()).toBe(false);

    mockSelectEnabled.mockReturnValue(true);
    mockIsConfigured.mockReturnValue(false);
    expect(isEnabled()).toBe(false);
  });

  it('wires unlock and auth callbacks through the init messenger', async () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);
    const options = mockCreate.mock.calls[0][0];

    initMessenger.call.mockReturnValueOnce({ isUnlocked: true });
    expect(options.isUnlocked()).toBe(true);
    expect(initMessenger.call).toHaveBeenCalledWith(
      'KeyringController:getState',
    );

    initMessenger.call.mockResolvedValueOnce('profile-id');
    await expect(options.refreshCanonicalProfileId()).resolves.toBe(
      'profile-id',
    );

    initMessenger.call.mockResolvedValueOnce('bearer');
    await expect(options.getBearerToken()).resolves.toBe('bearer');

    initMessenger.call.mockResolvedValueOnce({ token: 'social' });
    await expect(options.exchangeSocialAccessToken()).resolves.toEqual({
      token: 'social',
    });
  });
});
