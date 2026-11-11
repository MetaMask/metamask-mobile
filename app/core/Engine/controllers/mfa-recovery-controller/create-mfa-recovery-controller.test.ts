import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
} from '@metamask/mfa-recovery-controller';
import { createMfaRecoveryController } from './create-mfa-recovery-controller';

const mockController = {
  getPhase: jest.fn(),
};

const WRAP_PUBLIC_KEY = new Uint8Array(32).fill(1);
const RECEIPT_PUBLIC_KEY = new Uint8Array(32).fill(2);

jest.mock('@metamask/mfa-recovery-controller', () => ({
  MfaRecoveryController: jest.fn(),
  CubistEscrowProvider: jest.fn(() => ({
    id: 'cubist',
    isAvailable: jest.fn(),
  })),
}));

jest.mock('./config', () => ({
  ...jest.requireActual('./config'),
  tryGetCubistKeys: jest.fn(() => ({
    wrapPublicKey: new Uint8Array(32).fill(1),
    receiptPublicKey: new Uint8Array(32).fill(2),
  })),
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
  const mockCubistEscrowProvider = jest.mocked(CubistEscrowProvider);

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
    const authProvider = {
      getAuthenticatedProfileId: jest.fn(),
      authorizeRecoveryRequest: jest.fn(),
    };
    const getAddress = jest.fn().mockReturnValue('0xabc');
    const signPersonalMessage = jest.fn();

    const result = createMfaRecoveryController({
      messenger,
      state: { pendingOperation: null },
      authProvider,
      getBearerToken: jest.fn(),
      getAddress,
      signPersonalMessage,
      pendingOperationEncryptor,
      isEnabled: () => true,
    });

    expect(mockCubistEscrowProvider).toHaveBeenCalledWith({
      getClient: expect.any(Function),
      authAudience: 'gamma.signer.cubist.dev',
      wrapPublicKey: WRAP_PUBLIC_KEY,
      receiptPublicKey: RECEIPT_PUBLIC_KEY,
    });
    expect(MfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger,
        state: { pendingOperation: null },
        pendingOperationEncryptor: {
          encrypt: expect.any(Function),
          decrypt: expect.any(Function),
        },
        escrows: [expect.objectContaining({ id: 'cubist' })],
        authProvider: {
          getAuthenticatedProfileId: expect.any(Function),
          authorizeRecoveryRequest: expect.any(Function),
        },
        identifierAuthProvider: result.identifierRouter,
      }),
    );
    expect(result.controller).toBe(mockController);
  });
});
