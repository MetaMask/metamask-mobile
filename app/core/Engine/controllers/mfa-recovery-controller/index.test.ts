import { mnemonicToSeed } from '@metamask/key-tree';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
import { getRecoveryRegistrationLockProviderMessenger } from '../../messengers/mfa-recovery-controller-messenger';
import { createSrpSiweSigner } from './auth/srp-siwe-signer';
import { isMfaRecoveryConfigured } from './config';
import { createMfaRecoveryController } from './create-mfa-recovery-controller';
import { mfaRecoveryControllerInit } from './index';

jest.mock('../../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: { resultFunc: jest.fn() },
}));

jest.mock('./config', () => ({
  isMfaRecoveryConfigured: jest.fn(),
}));

jest.mock('./create-mfa-recovery-controller', () => ({
  createMfaRecoveryController: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/passkeyAdapter', () => ({
  mobilePasskeyAdapter: { get: jest.fn() },
}));

jest.mock('../../messengers/mfa-recovery-controller-messenger', () => ({
  getRecoveryRegistrationLockProviderMessenger: jest.fn(),
}));

const mockCreate = jest.mocked(createMfaRecoveryController);
const mockGetLockProviderMessenger = jest.mocked(
  getRecoveryRegistrationLockProviderMessenger,
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReturnValue(controller as never);
    mockGetLockProviderMessenger.mockReturnValue(
      lockProviderMessenger as never,
    );
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
    expect(mockGetLockProviderMessenger).toHaveBeenCalledWith(initMessenger);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: controllerMessenger,
        lockProviderMessenger,
        state: { pendingOperation: null, other: 'keep' },
      }),
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
      const { siweSigner } = mockCreate.mock.calls[0][0];
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
      const { siweSigner } = mockCreate.mock.calls[0][0];
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
