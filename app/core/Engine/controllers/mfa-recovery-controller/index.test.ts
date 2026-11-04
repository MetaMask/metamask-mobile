import { getRootExtendedMessenger } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { AuthenticationRecoveryAuthProvider } from './auth-provider';
import { createMfaRecoveryController } from './create-mfa-recovery-controller';
import {
  getMfaRecoveryIdentifierRouter,
  mfaRecoveryControllerInit,
} from './index';

jest.mock('./create-mfa-recovery-controller', () => ({
  createMfaRecoveryController: jest.fn(),
}));

jest.mock('./config', () => ({
  isMfaRecoveryConfigured: jest.fn(() => true),
}));

jest.mock('../../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: {
    resultFunc: jest.fn(() => true),
  },
}));

describe('mfaRecoveryControllerInit', () => {
  const mockController = {
    getPhase: jest.fn(),
    resume: jest.fn(),
  };
  const mockIdentifierRouter = {};
  const mockCreateMfaRecoveryController = jest.mocked(
    createMfaRecoveryController,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockController.getPhase.mockResolvedValue('idle');
    mockController.resume.mockResolvedValue(undefined);
    mockCreateMfaRecoveryController.mockReturnValue({
      controller: mockController as never,
      identifierRouter: mockIdentifierRouter as never,
    });
  });

  it('creates the controller with persisted state and resumes after unlock', async () => {
    const request = buildMessengerClientInitRequestMock(
      getRootExtendedMessenger(),
    );
    const call = jest.fn((action: string) => {
      switch (action) {
        case 'KeyringController:getState':
          return { isUnlocked: false, keyrings: [{ accounts: ['0xabc'] }] };
        case 'RemoteFeatureFlagController:getState':
          return { remoteFeatureFlags: {} };
        case 'AuthenticationController:getBearerToken':
          return 'bearer-token';
        case 'KeyringController:exportEncryptionKey':
          return 'encryption-key';
        default:
          return undefined;
      }
    });
    const subscribe = jest.fn();
    const delegate = jest.fn();
    request.initMessenger = { call, subscribe, delegate } as never;
    request.persistedState = {
      MfaRecoveryController: { pendingOperation: 'encrypted-operation' },
    };

    const result = mfaRecoveryControllerInit(request as never);

    expect(result.controller).toBe(mockController);
    expect(mockCreateMfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { pendingOperation: 'encrypted-operation' },
        authProvider: expect.any(AuthenticationRecoveryAuthProvider),
        getAddress: expect.any(Function),
        signPersonalMessage: expect.any(Function),
        isEnabled: expect.any(Function),
      }),
    );
    expect(delegate).toHaveBeenCalledWith({
      actions: [
        'AuthenticationController:refreshCanonicalProfileId',
        'AuthenticationController:requestMfaApproval',
      ],
      messenger: expect.anything(),
    });
    expect(subscribe).toHaveBeenCalledWith(
      'KeyringController:unlock',
      expect.any(Function),
    );
    expect(getMfaRecoveryIdentifierRouter()).toBe(mockIdentifierRouter);

    mockController.getPhase.mockResolvedValue('authorizing');
    subscribe.mock.calls[0][1]();
    await Promise.resolve();
    expect(mockController.resume).toHaveBeenCalledTimes(1);
  });
});
