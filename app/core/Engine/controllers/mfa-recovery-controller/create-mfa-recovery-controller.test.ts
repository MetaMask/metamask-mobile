import {
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
} from '@metamask/mfa-recovery-controller';
import { createMfaRecoveryController } from './create-mfa-recovery-controller';

const mockController = {
  getPhase: jest.fn(),
};

jest.mock('@metamask/mfa-recovery-controller', () => ({
  MfaRecoveryController: jest.fn(),
  CubistEscrowProvider: jest.fn(),
}));

jest.mock('@cubist-labs/cubesigner-sdk', () => ({
  CubeSignerClient: {
    createOidcSession: jest.fn(),
    create: jest.fn(),
  },
  envs: { gamma: {} },
}));

describe('createMfaRecoveryController', () => {
  const mockMfaRecoveryController = jest.mocked(MfaRecoveryController);

  beforeEach(() => {
    jest.clearAllMocks();
    mockMfaRecoveryController.mockReturnValue(mockController as never);
  });

  it('creates the controller with production providers and persisted state', () => {
    const pendingOperationEncryptor = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };
    const messenger = {} as MfaRecoveryControllerMessenger;
    const getBearerToken = jest.fn();
    const getAddress = jest.fn().mockReturnValue('0xabc');
    const signPersonalMessage = jest.fn();
    const exportEncryptionKey = jest.fn();

    const result = createMfaRecoveryController({
      messenger,
      state: { pendingOperation: null },
      getBearerToken,
      getAddress,
      signPersonalMessage,
      exportEncryptionKey,
      pendingOperationEncryptor,
      isEnabled: () => true,
    });

    expect(MfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger,
        state: { pendingOperation: null },
        pendingOperationEncryptor,
        escrows: [expect.objectContaining({ id: 'cubist' })],
        authProvider: expect.objectContaining({
          getAuthenticatedProfileId: expect.any(Function),
        }),
        identifierAuthProvider: result.identifierRouter,
      }),
    );
    expect(result.controller).toBe(mockController);
  });
});
