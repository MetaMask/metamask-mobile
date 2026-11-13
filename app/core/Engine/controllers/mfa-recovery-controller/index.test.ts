import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
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

const mockCreate = jest.mocked(createMfaRecoveryController);
const mockSelectEnabled = jest.mocked(selectMfaRecoveryEnabled.resultFunc);
const mockIsConfigured = jest.mocked(isMfaRecoveryConfigured);

describe('mfaRecoveryControllerInit', () => {
  const controller = { name: 'MfaRecoveryController' };
  const controllerMessenger = { kind: 'controller' };
  const initMessenger = {
    call: jest.fn(),
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
