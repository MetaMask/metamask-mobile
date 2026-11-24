import { mnemonicToSeed } from '@metamask/key-tree';
import {
  CubistEscrowProvider,
  MfaRecoveryController,
  RecoveryRegistrationLockProvider,
  UserStorageTrustedIdentifierStore,
} from '@metamask/mfa-recovery-controller';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
import {
  getRecoveryRegistrationLockProviderMessenger,
  getUserStorageTrustedIdentifierStoreMessenger,
} from '../../messengers/mfa-recovery-controller-messenger';
import { RecoveryIdentifierRouter } from './auth/identifier-auth-provider';
import { createCubistSessionTokenProvider } from './auth/session-token-provider';
import { createSrpSiweSigner } from './auth/srp-siwe-signer';
import {
  getRegistrationUrl,
  isMfaRecoveryConfigured,
  tryGetCubistEscrowConfig,
} from './config';
import { createCubistClientGetter } from './cubist-escrow-provider';
import { mfaRecoveryControllerInit } from './index';

jest.mock('@metamask/mfa-recovery-controller', () => ({
  CubistEscrowProvider: jest.fn().mockImplementation(() => ({
    applyMutation: jest.fn(),
  })),
  MfaRecoveryController: jest.fn(),
  RecoveryRegistrationLockProvider: jest.fn(),
  UserStorageTrustedIdentifierStore: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: { resultFunc: jest.fn() },
}));

jest.mock('./config', () => ({
  getRegistrationUrl: jest.fn(),
  isMfaRecoveryConfigured: jest.fn(),
  tryGetCubistEscrowConfig: jest.fn(),
}));

jest.mock('./auth/session-token-provider', () => ({
  createCubistSessionTokenProvider: jest.fn(),
}));

jest.mock('./cubist-escrow-provider', () => ({
  createCubistClientGetter: jest.fn(),
}));

jest.mock('./auth/identifier-auth-provider', () => ({
  RecoveryIdentifierRouter: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/passkeyAdapter', () => ({
  mobilePasskeyAdapter: { get: jest.fn() },
}));

jest.mock('../../messengers/mfa-recovery-controller-messenger', () => ({
  getRecoveryRegistrationLockProviderMessenger: jest.fn(),
  getUserStorageTrustedIdentifierStoreMessenger: jest.fn(),
}));

const mockMfaRecoveryController = jest.mocked(MfaRecoveryController);
const mockLockProvider = jest.mocked(RecoveryRegistrationLockProvider);
const mockTrustedStore = jest.mocked(UserStorageTrustedIdentifierStore);
const mockEscrowProvider = jest.mocked(CubistEscrowProvider);
const mockCreateTokenProvider = jest.mocked(createCubistSessionTokenProvider);
const mockCreateClientGetter = jest.mocked(createCubistClientGetter);
const mockIdentifierRouter = jest.mocked(RecoveryIdentifierRouter);
const mockGetLockProviderMessenger = jest.mocked(
  getRecoveryRegistrationLockProviderMessenger,
);
const mockGetTrustedIdentifierStoreMessenger = jest.mocked(
  getUserStorageTrustedIdentifierStoreMessenger,
);
const mockSelectEnabled = jest.mocked(selectMfaRecoveryEnabled.resultFunc);
const mockIsConfigured = jest.mocked(isMfaRecoveryConfigured);

describe('mfaRecoveryControllerInit', () => {
  const controller = { name: 'MfaRecoveryController' };
  const controllerMessenger = { kind: 'controller' };
  const initMessenger = {
    call: jest.fn(),
  };
  const lockProviderMessenger = { kind: 'lock-provider' };
  const trustedIdentifierStoreMessenger = { kind: 'trusted-identifier-store' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMfaRecoveryController.mockImplementation(() => controller as never);
    mockGetLockProviderMessenger.mockReturnValue(
      lockProviderMessenger as never,
    );
    mockGetTrustedIdentifierStoreMessenger.mockReturnValue(
      trustedIdentifierStoreMessenger as never,
    );
    jest
      .mocked(getRegistrationUrl)
      .mockReturnValue('https://registration.example');
    jest.mocked(tryGetCubistEscrowConfig).mockReturnValue({
      wrapPublicKey: new Uint8Array([1]),
      receiptPublicKey: new Uint8Array([2]),
      authAudience: 'aud',
    });
    mockSelectEnabled.mockReturnValue(true);
    mockIsConfigured.mockReturnValue(true);
  });

  it('preserves an object pendingOperation from persisted state and wires messengers', () => {
    const pendingOperation = { phase: 'writing', mutation: { id: 'm1' } };
    const { controller: created } = mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {
        MfaRecoveryController: {
          pendingOperation,
          lockId: 'lock-1',
        },
      },
    } as never);

    expect(created).toBe(controller);
    expect(mockGetLockProviderMessenger).toHaveBeenCalledWith(initMessenger);
    expect(mockGetTrustedIdentifierStoreMessenger).toHaveBeenCalledWith(
      initMessenger,
    );
    expect(mockLockProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://registration.example',
        messenger: lockProviderMessenger,
      }),
    );
    expect(mockTrustedStore).toHaveBeenCalledWith({
      messenger: trustedIdentifierStoreMessenger,
    });
    expect(mockEscrowProvider).toHaveBeenCalledWith(
      expect.objectContaining({ authAudience: 'aud' }),
    );
    expect(mockMfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: controllerMessenger,
        state: { pendingOperation, lockId: 'lock-1' },
      }),
    );
  });

  it('clears a legacy encrypted string pendingOperation from persisted state', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {
        MfaRecoveryController: {
          pendingOperation: '{"data":"ciphertext"}',
          lockId: 'lock-1',
        },
      },
    } as never);

    expect(mockMfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { pendingOperation: null, lockId: 'lock-1' },
      }),
    );
  });

  it('passes undefined state when nothing was persisted', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);

    expect(mockMfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({ state: undefined }),
    );
  });

  it('enables recovery only when the flag and configuration are both ready', () => {
    mfaRecoveryControllerInit({
      controllerMessenger,
      initMessenger,
      persistedState: {},
    } as never);
    const { isEnabled } = mockCreateClientGetter.mock.calls[0][0];
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
    const options = mockCreateTokenProvider.mock.calls[0][0];

    initMessenger.call.mockReturnValueOnce({ isUnlocked: true });
    expect(options.isUnlocked()).toBe(true);
    expect(initMessenger.call).toHaveBeenCalledWith(
      'KeyringController:getState',
    );

    initMessenger.call.mockResolvedValueOnce({
      canonicalProfileId: 'profile-id',
    });
    await expect(options.getCanonicalProfileId()).resolves.toBe('profile-id');
    expect(initMessenger.call).toHaveBeenCalledWith(
      'AuthenticationController:getSessionProfile',
    );

    initMessenger.call
      .mockResolvedValueOnce({ canonicalProfileId: '' })
      .mockResolvedValueOnce('refreshed-profile-id');
    await expect(options.getCanonicalProfileId()).resolves.toBe(
      'refreshed-profile-id',
    );
    expect(initMessenger.call).toHaveBeenCalledWith(
      'AuthenticationController:refreshCanonicalProfileId',
    );

    initMessenger.call.mockResolvedValueOnce('bearer');
    await expect(options.getBearerToken()).resolves.toBe('bearer');

    initMessenger.call.mockResolvedValueOnce({ token: 'social' });
    await expect(options.exchangeSocialAccessToken()).resolves.toEqual({
      token: 'social',
    });
  });

  describe('SIWE signer', () => {
    const entropySourceId = 'primary-hd-keyring-id';
    let seed: Uint8Array;

    beforeAll(async () => {
      seed = await mnemonicToSeed(
        'test test test test test test test test test test test junk',
      );
    });

    function mockKeyring(isUnlocked: boolean): void {
      initMessenger.call.mockImplementation(
        (action: string, ...args: unknown[]): unknown => {
          if (action === 'KeyringController:getState') {
            return {
              isUnlocked,
              keyrings: [
                {
                  type: 'HD Key Tree',
                  accounts: ['0xprimary'],
                  metadata: { id: entropySourceId, name: '' },
                },
              ],
            };
          }
          const operation = args[1] as (operationArgs: {
            keyring: unknown;
          }) => Promise<unknown>;
          return operation({ keyring: { seed } });
        },
      );
    }

    it('signs with the primary SRP message-signing key from the keyring', async () => {
      mfaRecoveryControllerInit({
        controllerMessenger,
        initMessenger,
        persistedState: {},
      } as never);
      const { siweSigner } = mockIdentifierRouter.mock.calls[0][0];
      const expectedSigner = createSrpSiweSigner({
        getSeed: async () => new Uint8Array(seed),
      });
      mockKeyring(true);

      const address = await siweSigner.getAddress();
      const signature = await siweSigner.signMessage('hello');

      expect(address).toBe(await expectedSigner.getAddress());
      expect(signature).toBe(await expectedSigner.signMessage('hello'));
      expect(initMessenger.call).toHaveBeenCalledWith(
        'KeyringController:getState',
      );
      expect(initMessenger.call).toHaveBeenCalledWith(
        'KeyringController:withKeyringV2Unsafe',
        { id: entropySourceId },
        expect.any(Function),
      );
    });

    it('rejects with primary_account_unavailable while locked', async () => {
      mfaRecoveryControllerInit({
        controllerMessenger,
        initMessenger,
        persistedState: {},
      } as never);
      const { siweSigner } = mockIdentifierRouter.mock.calls[0][0];
      mockKeyring(false);

      await expect(siweSigner.getAddress()).rejects.toMatchObject({
        code: 'primary_account_unavailable',
      });
      expect(initMessenger.call).not.toHaveBeenCalledWith(
        'KeyringController:withKeyringV2Unsafe',
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
