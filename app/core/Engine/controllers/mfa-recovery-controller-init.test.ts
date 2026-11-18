import { MfaRecoveryController } from '@metamask/mfa-recovery-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import Logger from '../../../util/Logger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getMfaRecoveryControllerMessenger,
  type MfaRecoveryControllerInitMessenger,
} from '../messengers/mfa-recovery-controller-messenger';
import type { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { mfaRecoveryControllerInit } from './mfa-recovery-controller-init';

jest.mock('@metamask/mfa-recovery-controller', () => {
  const actual = jest.requireActual('@metamask/mfa-recovery-controller');
  return {
    ...actual,
    MfaRecoveryController: jest.fn(),
  };
});

jest.mock('../../MfaRecovery', () => ({
  createMoneyMfaOidcIdentifierAuthProvider: jest.fn(() => ({
    getKeyBoundIdentifierLogin: jest.fn(),
  })),
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    ReturnType<typeof getMfaRecoveryControllerMessenger>,
    MfaRecoveryControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const initMessenger = {
    call: jest.fn().mockReturnValue({ remoteFeatureFlags: {} }),
  } as unknown as MfaRecoveryControllerInitMessenger;

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMfaRecoveryControllerMessenger(baseMessenger),
    initMessenger,
    persistedState: {},
  };
}

describe('mfaRecoveryControllerInit', () => {
  const controllerMock = jest.mocked(MfaRecoveryController);

  beforeEach(() => {
    jest.clearAllMocks();
    controllerMock.mockImplementation(
      () => ({}) as unknown as MfaRecoveryController,
    );
  });

  it('initializes MfaRecoveryController with left-path stubs and Money MFA identifier provider', () => {
    const request = getInitRequestMock();
    const { controller } = mfaRecoveryControllerInit(request);

    expect(controller).toBeDefined();
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: request.controllerMessenger,
        state: undefined,
        authProvider: expect.objectContaining({
          getAuthenticatedProfileId: expect.any(Function),
          authorizeRecoveryRequest: expect.any(Function),
        }),
        lockProvider: expect.objectContaining({
          acquire: expect.any(Function),
          release: expect.any(Function),
        }),
        identifierAuthProvider: expect.objectContaining({
          getKeyBoundIdentifierLogin: expect.any(Function),
        }),
        escrows: [
          expect.objectContaining({
            id: 'left-path-stub',
            isAvailable: expect.any(Function),
            getMutationReceipt: expect.any(Function),
          }),
        ],
        pendingOperationEncryptor: expect.objectContaining({
          encrypt: expect.any(Function),
          decrypt: expect.any(Function),
        }),
      }),
    );
  });

  it('passes persisted MfaRecoveryController state when present', () => {
    const request = getInitRequestMock();
    request.persistedState = {
      MfaRecoveryController: { pendingOperation: null },
    };

    mfaRecoveryControllerInit(request);

    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { pendingOperation: null },
      }),
    );
  });

  it('logs and skips registering when controller construction fails', () => {
    controllerMock.mockImplementation(() => {
      throw new Error('construct failed');
    });

    const result = mfaRecoveryControllerInit(getInitRequestMock());

    expect(result.controller).toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'mfa',
          operation: 'mfa_recovery_controller_init',
        }),
      }),
    );
  });

  it('left-path stubs throw when Cubist/auth surfaces are called', async () => {
    mfaRecoveryControllerInit(getInitRequestMock());
    const args = controllerMock.mock.calls[0][0];

    await expect(args.authProvider.getAuthenticatedProfileId()).rejects.toThrow(
      'authProvider.getAuthenticatedProfileId is not wired',
    );
    await expect(
      args.authProvider.authorizeRecoveryRequest({} as never),
    ).rejects.toThrow('authProvider.authorizeRecoveryRequest is not wired');

    await expect(args.lockProvider.acquire('lock-1')).rejects.toThrow(
      'lockProvider.acquire is not wired',
    );
    await expect(args.lockProvider.release('lock-1')).rejects.toThrow(
      'lockProvider.release is not wired',
    );

    const escrow = args.escrows[0];
    await expect(escrow.isAvailable()).resolves.toBe(false);
    await expect(escrow.generateChallenge({} as never)).rejects.toThrow(
      'escrow.generateChallenge is not wired',
    );
    await expect(escrow.getIdentifiers({} as never)).rejects.toThrow(
      'escrow.getIdentifiers is not wired',
    );
    await expect(
      escrow.getMutationReceipt({} as never, {} as never),
    ).rejects.toThrow('escrow.getMutationReceipt is not wired');
    await expect(
      escrow.getSecret({} as never, {} as never, '' as never, {} as never),
    ).rejects.toThrow('escrow.getSecret is not wired');
    await expect(
      escrow.applyMutation(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ),
    ).rejects.toThrow('escrow.applyMutation is not wired');
    await expect(
      escrow.verifyReceipt({} as never, {} as never, '' as never),
    ).rejects.toThrow('escrow.verifyReceipt is not wired');

    await expect(
      args.pendingOperationEncryptor.encrypt({} as never),
    ).rejects.toThrow('pendingEncryptor.encrypt is not wired');
    await expect(
      args.pendingOperationEncryptor.decrypt({} as never),
    ).rejects.toThrow('pendingEncryptor.decrypt is not wired');
  });

  it('identifier auth provider reads remote feature flags via init messenger', () => {
    const { createMoneyMfaOidcIdentifierAuthProvider } = jest.requireMock(
      '../../MfaRecovery',
    ) as {
      createMoneyMfaOidcIdentifierAuthProvider: jest.Mock;
    };
    const request = getInitRequestMock();

    mfaRecoveryControllerInit(request);

    const options = createMoneyMfaOidcIdentifierAuthProvider.mock
      .calls[0][0] as {
      getRemoteFeatureFlags: () => unknown;
    };
    expect(options.getRemoteFeatureFlags()).toEqual({});
    expect(request.initMessenger.call).toHaveBeenCalledWith(
      'RemoteFeatureFlagController:getState',
    );
  });
});
