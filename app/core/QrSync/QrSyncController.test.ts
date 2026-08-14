import type { AccountTreeControllerImportStateAction } from '@metamask/account-tree-controller';
import type {
  IKeyManager,
  SessionRequest,
} from '@metamask/mobile-wallet-protocol-core';
import { Messenger } from '@metamask/messenger';
import type { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';

import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSyncFlows,
} from './constants';
import {
  QR_SYNC_CONTROLLER_NAME,
  type QrSyncControllerMessenger,
} from './controller-types';
import {
  defaultQrSyncControllerState,
  QrSyncController,
} from './QrSyncController';
import { createQrSyncWalletClient } from './services/create-qr-sync-wallet-client';
import { QR_SYNC_MWP_DEEPLINK_PREFIX } from './services/qr-sync-validation';
import type { QrSyncSyncReadyMessage } from './types';

jest.mock('@metamask/account-tree-controller', () => {
  const actual = jest.requireActual('@metamask/account-tree-controller');
  return {
    ...actual,
    AccountTreeSnapshot: {
      ...actual.AccountTreeSnapshot,
      deserialize: jest.fn((payload: unknown) => Promise.resolve(payload)),
    },
  };
});

jest.mock('./services/create-qr-sync-wallet-client');

const mockCreateQrSyncWalletClient =
  createQrSyncWalletClient as jest.MockedFunction<
    typeof createQrSyncWalletClient
  >;

const VALID_SESSION_ID = '11111111-2222-3333-4444-555555555555';
const VALID_CHANNEL = 'handshake:aabbccdd-1122-3344-5566-778899aabbcc';
const VALID_PUBLIC_KEY_B64 = 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V';
const TEST_RELAY_URL = 'wss://test-relay.example.com';
const FIXED_NOW = 1_800_000_000_000;

type WalletClientListener = (...args: unknown[]) => void;

const encodeSecret = (plaintext: string): string =>
  Buffer.from(plaintext, 'utf-8').toString('base64');

const encodeBase64Json = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf-8').toString('base64');

const createMwpDeeplink = (payload: string): string =>
  `${QR_SYNC_MWP_DEEPLINK_PREFIX}?p=${encodeURIComponent(payload)}`;

const createSessionRequest = (
  overrides: Partial<SessionRequest> = {},
): SessionRequest => ({
  id: VALID_SESSION_ID,
  publicKeyB64: VALID_PUBLIC_KEY_B64,
  channel: VALID_CHANNEL,
  mode: 'untrusted',
  expiresAt: Date.now() + 600_000,
  ...overrides,
});

const createSyncReadyWireMessage = (
  options: { privateKeyOnly?: boolean } = {},
): QrSyncSyncReadyMessage => {
  if (options.privateKeyOnly) {
    return {
      type: QrSyncActionTypes.SYNC_READY,
      version: QrSyncMessageVersion.V1,
      deadline: Date.now() + 60_000,
      data: {
        version: 1,
        wallets: [
          {
            id: 'wallet:pk' as `wallet:${string}`,
            type: 'private-key',
            metadata: { name: 'Imported Accounts' },
            groups: [
              {
                id: 'wallet:pk/0xabc' as `wallet:${string}/${string}`,
                value: {
                  privateKey: [0x0, 0xa, 0xb, 0xc],
                  encoding: 'hexadecimal' as const,
                },
                metadata: {
                  name: 'Imported Account 1',
                  pinned: false,
                  hidden: false,
                },
              },
            ],
          },
        ],
      },
    };
  }

  return {
    type: QrSyncActionTypes.SYNC_READY,
    version: QrSyncMessageVersion.V1,
    deadline: Date.now() + 60_000,
    data: {
      version: 1,
      wallets: [
        {
          id: 'wallet:test-primary' as `wallet:${string}`,
          type: 'mnemonic',
          value: [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6],
          metadata: { name: 'Wallet 1' },
          groups: [
            {
              id: 'wallet:test-primary/0' as `wallet:${string}/${string}`,
              groupIndex: 0,
              metadata: { name: 'Account 1', pinned: false, hidden: false },
            },
          ],
        },
      ],
    },
  };
};

const flushPromises = async (times = 5): Promise<void> => {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
};

const buildMessenger = (): QrSyncControllerMessenger =>
  new Messenger({
    namespace: QR_SYNC_CONTROLLER_NAME,
  });

const buildMessengerWithImportState = (
  mockImportState: jest.Mock,
): QrSyncControllerMessenger => {
  // AccountTreeController:importState lives in the AccountTreeController namespace.
  // Build a parent messenger for that namespace, register the handler, then create
  // a QrSyncController child with the action delegated down.
  const atcMessenger = new Messenger({
    namespace: 'AccountTreeController',
  }) as unknown as Messenger<
    'AccountTreeController',
    AccountTreeControllerImportStateAction,
    never
  >;
  atcMessenger.registerActionHandler(
    'AccountTreeController:importState',
    mockImportState,
  );
  return atcMessenger.buildChild({
    namespace: QR_SYNC_CONTROLLER_NAME,
    actions: ['AccountTreeController:importState'],
    events: [],
  }) as unknown as QrSyncControllerMessenger;
};

interface MockWalletClientHarness {
  client: jest.Mocked<WalletClient>;
  emit: (event: string, ...args: unknown[]) => void;
  completeOtpHandshake: () => void;
}

const buildMockWalletClient = (
  options: { deferOtpAck?: boolean } = {},
): MockWalletClientHarness => {
  const listeners = new Map<string, Set<WalletClientListener>>();
  let completeHandshake: (() => void) | undefined;

  const emit = (event: string, ...args: unknown[]) => {
    listeners.get(event)?.forEach((listener) => {
      listener(...args);
    });
  };

  const client = {
    on: jest.fn((event: string, listener: WalletClientListener) => {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    }),
    off: jest.fn((event: string, listener: WalletClientListener) => {
      listeners.get(event)?.delete(listener);
    }),
    connect: jest.fn().mockImplementation(async () => {
      emit('display_otp', '123456', FIXED_NOW + 30_000);

      if (options.deferOtpAck) {
        await new Promise<void>((resolve) => {
          completeHandshake = resolve;
        });
      }

      emit('connected');
    }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    sendResponse: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WalletClient>;

  return {
    client,
    emit,
    completeOtpHandshake: () => {
      completeHandshake?.();
    },
  };
};

const buildController = (
  options: {
    getIsOnboardingCompleted?: () => boolean;
  } = {},
): QrSyncController => {
  const keyManager = {} as IKeyManager;

  return new QrSyncController({
    messenger: buildMessenger(),
    keyManager,
    relayUrl: TEST_RELAY_URL,
    getIsOnboardingCompleted: options.getIsOnboardingCompleted ?? (() => false),
  });
};

const buildValidScanPayload = (): string =>
  createMwpDeeplink(encodeBase64Json(createSessionRequest()));

const startSession = async (
  controller: QrSyncController,
  walletClient: MockWalletClientHarness,
): Promise<void> => {
  mockCreateQrSyncWalletClient.mockResolvedValue({
    sessionId: VALID_SESSION_ID,
    client: walletClient.client,
  });

  await controller.handleScannedQrPayload(buildValidScanPayload());
  await flushPromises();
};

describe('QrSyncController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts idle with no OTP, import plan, or error', () => {
      const controller = buildController();

      expect(controller.state).toEqual(defaultQrSyncControllerState);
    });
  });

  describe('handleScannedQrPayload', () => {
    it('creates a wallet client, connects, and sends sync-offer for a valid deeplink', async () => {
      const controller = buildController({
        getIsOnboardingCompleted: () => true,
      });
      const walletClient = buildMockWalletClient();

      mockCreateQrSyncWalletClient.mockResolvedValue({
        sessionId: VALID_SESSION_ID,
        client: walletClient.client,
      });

      await controller.handleScannedQrPayload(buildValidScanPayload());
      await flushPromises();

      expect(mockCreateQrSyncWalletClient).toHaveBeenCalledWith({
        sessionId: VALID_SESSION_ID,
        keyManager: expect.any(Object),
        relayUrl: TEST_RELAY_URL,
      });
      expect(walletClient.client.connect).toHaveBeenCalledWith({
        sessionRequest: createSessionRequest(),
      });
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_OFFER,
        version: QrSyncMessageVersion.V1,
        data: {
          sessionId: VALID_SESSION_ID,
          isOnboardingCompleted: true,
        },
      });
      expect(walletClient.client.sendResponse).toHaveBeenCalledTimes(1);
      expect(controller.state.phase).toBe(QrSyncPhases.AWAITING_SYNC_READY);
      expect(controller.state.connectionStatus).toBe('connected');
      expect(controller.state.syncFlow).toBe(QrSyncSyncFlows.EXISTING_USER);
    });

    it('captures NEW_USER syncFlow when onboarding is incomplete', async () => {
      const controller = buildController({
        getIsOnboardingCompleted: () => false,
      });
      const walletClient = buildMockWalletClient();

      mockCreateQrSyncWalletClient.mockResolvedValue({
        sessionId: VALID_SESSION_ID,
        client: walletClient.client,
      });

      await controller.handleScannedQrPayload(buildValidScanPayload());
      await flushPromises();

      expect(controller.state.syncFlow).toBe(QrSyncSyncFlows.NEW_USER);
    });

    it('throws when the scan payload cannot be parsed', async () => {
      const controller = buildController();

      await expect(
        controller.handleScannedQrPayload('not-a-deeplink'),
      ).rejects.toThrow('QR sync scan payload is not a valid MWP deeplink.');

      expect(mockCreateQrSyncWalletClient).not.toHaveBeenCalled();
      expect(controller.state.phase).toBe(QrSyncPhases.IDLE);
      expect(controller.state.error).toBeNull();
    });

    it('enters failed phase when wallet client creation throws', async () => {
      const controller = buildController();

      mockCreateQrSyncWalletClient.mockRejectedValue(
        new Error('Relay unavailable'),
      );

      await controller.handleScannedQrPayload(buildValidScanPayload());
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'CHANNEL_INIT_FAILED',
        message: 'Relay unavailable',
      });
    });

    it('clears an existing session before starting a new scan', async () => {
      const controller = buildController();
      const firstClient = buildMockWalletClient();
      const secondClient = buildMockWalletClient();

      mockCreateQrSyncWalletClient
        .mockResolvedValueOnce({
          sessionId: VALID_SESSION_ID,
          client: firstClient.client,
        })
        .mockResolvedValueOnce({
          sessionId: VALID_SESSION_ID,
          client: secondClient.client,
        });

      await controller.handleScannedQrPayload(buildValidScanPayload());
      await flushPromises();

      await controller.handleScannedQrPayload(buildValidScanPayload());
      await flushPromises();

      expect(firstClient.client.disconnect).toHaveBeenCalledTimes(1);
      expect(secondClient.client.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelSession', () => {
    it('does nothing when no wallet client is attached', () => {
      const controller = buildController();

      controller.cancelSession();

      expect(controller.state).toEqual(defaultQrSyncControllerState);
    });

    it('notifies the extension with sync-cancel and returns to idle', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      controller.cancelSession();
      await flushPromises();

      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_CANCEL,
        version: QrSyncMessageVersion.V1,
      });
      expect(walletClient.client.disconnect).toHaveBeenCalled();
      expect(controller.state.phase).toBe(QrSyncPhases.IDLE);
      expect(controller.state.connectionStatus).toBe('disconnected');
    });
  });

  describe('wallet client events', () => {
    it('stores OTP details while connect waits for extension OTP verification', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient({ deferOtpAck: true });

      mockCreateQrSyncWalletClient.mockResolvedValue({
        sessionId: VALID_SESSION_ID,
        client: walletClient.client,
      });

      const scanPromise = controller.handleScannedQrPayload(
        buildValidScanPayload(),
      );
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.DISPLAYING_OTP);
      expect(controller.state.otp).toEqual({
        otp: '123456',
        deadline: FIXED_NOW + 30_000,
      });
      expect(walletClient.client.sendResponse).not.toHaveBeenCalled();

      walletClient.completeOtpHandshake();
      await scanPromise;
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.AWAITING_SYNC_READY);
      expect(walletClient.client.sendResponse).toHaveBeenCalledTimes(1);
    });

    it('sends sync-offer once after connect completes the OTP handshake', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      mockCreateQrSyncWalletClient.mockResolvedValue({
        sessionId: VALID_SESSION_ID,
        client: walletClient.client,
      });

      await controller.handleScannedQrPayload(buildValidScanPayload());
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.AWAITING_SYNC_READY);
      expect(controller.state.connectionStatus).toBe('connected');
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_OFFER,
        version: QrSyncMessageVersion.V1,
        data: {
          sessionId: VALID_SESSION_ID,
          isOnboardingCompleted: false,
        },
      });
      expect(walletClient.client.sendResponse).toHaveBeenCalledTimes(1);
    });

    it('stores pending secrets and completes the session after sync-ready message', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.COMPLETED);
      expect(controller.state.pendingPayload).toMatchObject({
        version: 1,
        wallets: [
          {
            type: 'mnemonic',
            value: expect.any(Array),
            metadata: { name: 'Wallet 1' },
            groups: [{ groupIndex: 0, metadata: { name: 'Account 1' } }],
          },
        ],
      });
      expect(controller.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.AWAITING_PASSWORD,
      );
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_COMPLETED,
        version: QrSyncMessageVersion.V1,
      });
      expect(walletClient.client.disconnect).toHaveBeenCalled();
    });

    it('fails when sync-ready omits a primary mnemonic during onboarding', async () => {
      const controller = buildController({
        getIsOnboardingCompleted: () => false,
      });
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit(
        'message',
        createSyncReadyWireMessage({ privateKeyOnly: true }),
      );
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'INVALID_PAYLOAD',
        message:
          'QR sync payload must include a primary mnemonic for new-user onboarding.',
      });
      expect(controller.state.pendingPayload).toBeNull();
      expect(controller.state.provisioningStatus).toBeNull();
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_ERROR,
        version: QrSyncMessageVersion.V1,
        data: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic for new-user onboarding.',
        },
      });
    });

    it('accepts sync-ready without a primary mnemonic when onboarding is completed', async () => {
      const controller = buildController({
        getIsOnboardingCompleted: () => true,
      });
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit(
        'message',
        createSyncReadyWireMessage({ privateKeyOnly: true }),
      );
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.COMPLETED);
      expect(controller.state.pendingPayload).toMatchObject({
        version: 1,
        wallets: [{ type: 'private-key' }],
      });
      expect(controller.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.AWAITING_PASSWORD,
      );
    });

    it('returns to idle when the extension sends sync-cancel', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('message', {
        type: QrSyncActionTypes.SYNC_CANCEL,
        version: QrSyncMessageVersion.V1,
      });
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.IDLE);
      expect(controller.state.connectionStatus).toBe('disconnected');
      expect(walletClient.client.disconnect).toHaveBeenCalled();
    });

    it('enters failed phase when the extension sends sync-error', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();
      const peerError = {
        code: 'SYNC_REJECTED' as const,
        message: 'User rejected sync on extension',
      };

      await startSession(controller, walletClient);
      walletClient.client.sendResponse.mockClear();

      walletClient.emit('message', {
        type: QrSyncActionTypes.SYNC_ERROR,
        version: QrSyncMessageVersion.V1,
        data: peerError,
      });
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual(peerError);
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_ERROR,
        version: QrSyncMessageVersion.V1,
        data: peerError,
      });
    });

    it('enters failed phase with CHANNEL_DISCONNECTED when the client disconnects mid-session', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('disconnected');
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'CHANNEL_DISCONNECTED',
        message: 'QR sync connection was lost.',
      });
    });

    it('ignores disconnect events after the session already completed', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      walletClient.emit('disconnected');
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.COMPLETED);
      expect(controller.state.error).toBeNull();
    });

    it('enters failed phase when onboarding validation throws unexpectedly', async () => {
      let throwOnOnboardingCheck = false;
      const controller = buildController({
        getIsOnboardingCompleted: () => {
          if (throwOnOnboardingCheck) {
            throw new Error('Onboarding state unavailable');
          }
          return false;
        },
      });
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      throwOnOnboardingCheck = true;
      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'SYNC_FAILED',
        message: 'Onboarding state unavailable',
      });
    });

    it('resetState clears import plan and returns to idle', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      expect(controller.state.pendingPayload).not.toBeNull();

      controller.resetState();
      await flushPromises();

      expect(controller.state).toEqual(defaultQrSyncControllerState);
      expect(walletClient.client.disconnect).toHaveBeenCalled();
    });

    it('marks the connection errored and failed when the wallet client emits error', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);
      walletClient.client.sendResponse.mockClear();

      walletClient.emit('error', new Error('Handshake failed'));
      await flushPromises();

      expect(controller.state.connectionStatus).toBe('errored');
      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'SYNC_FAILED',
        message: 'Handshake failed',
      });
    });
  });

  describe('provisioning mutations', () => {
    it('clears pending payload and sets failed via markProvisioningFailed', async () => {
      const controller = buildController({
        getIsOnboardingCompleted: () => false,
      });
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);
      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      expect(controller.state.pendingPayload).not.toBeNull();

      controller.markProvisioningFailed();

      expect(controller.state.pendingPayload).toBeNull();
      expect(controller.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.FAILED,
      );
    });

    it('finalizeVaultCreation sets SECRETS_IMPORTED and calls importState when in AWAITING_PASSWORD', async () => {
      const mockImportState = jest.fn().mockResolvedValue(undefined);
      const messenger = buildMessengerWithImportState(mockImportState);
      const controller = new QrSyncController({
        messenger,
        keyManager: {} as IKeyManager,
        relayUrl: TEST_RELAY_URL,
        getIsOnboardingCompleted: () => false,
      });
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);
      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      expect(controller.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.AWAITING_PASSWORD,
      );

      await controller.finalizeVaultCreation();

      expect(controller.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.SECRETS_IMPORTED,
      );
      expect(mockImportState).toHaveBeenCalledTimes(1);
      expect(mockImportState).toHaveBeenCalledWith(
        controller.state.pendingPayload,
      );
    });

    it('finalizeVaultCreation is a no-op when not in AWAITING_PASSWORD', async () => {
      const controller = buildController();

      await controller.finalizeVaultCreation();

      expect(controller.state.provisioningStatus).toBeNull();
    });
  });
});
