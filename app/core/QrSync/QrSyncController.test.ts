import type { EntropySourceId } from '@metamask/keyring-api';
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
  QrSyncSecretTypes,
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
      data: [
        {
          type: QrSyncSecretTypes.PRIVATE_KEY,
          privateKey: encodeSecret('0xabc'),
          name: 'Imported Account 1',
        },
      ],
    };
  }

  return {
    type: QrSyncActionTypes.SYNC_READY,
    version: QrSyncMessageVersion.V1,
    deadline: Date.now() + 60_000,
    data: [
      {
        type: QrSyncSecretTypes.MNEMONIC,
        mnemonic: encodeSecret('word1 word2 word3'),
        name: 'Wallet 1',
        isPrimary: true,
        groups: [{ groupIndex: 0, name: 'Account 1' }],
      },
    ],
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

    it('terminates with GRANT_WAIT_TIMEOUT when the OTP grant deadline elapses', async () => {
      jest.useFakeTimers();
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

      jest.advanceTimersByTime(30_000);
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'GRANT_WAIT_TIMEOUT',
        message: 'QR sync OTP grant wait timed out before handshake completed.',
      });

      walletClient.completeOtpHandshake();
      await scanPromise;
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error?.code).toBe('GRANT_WAIT_TIMEOUT');
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          type: QrSyncActionTypes.SYNC_ERROR,
          data: expect.objectContaining({ code: 'GRANT_WAIT_TIMEOUT' }),
        }),
      );
      expect(walletClient.client.sendResponse).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: QrSyncActionTypes.SYNC_OFFER }),
      );
      jest.useRealTimers();
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
      expect(controller.state.pendingSecretImports).toEqual([
        {
          index: 0,
          value: 'word1 word2 word3',
          type: QrSyncSecretTypes.MNEMONIC,
          isPrimary: true,
        },
      ]);
      expect(controller.state.provisioningMetadata).toEqual({
        version: QrSyncMessageVersion.V1,
        entries: [
          {
            index: 0,
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: true,
            name: 'Wallet 1',
            groups: [{ groupIndex: 0, name: 'Account 1' }],
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
          'QR sync payload must include a primary mnemonic when onboarding is not completed.',
      });
      expect(controller.state.pendingSecretImports).toBeNull();
      expect(controller.state.provisioningStatus).toBeNull();
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_ERROR,
        version: QrSyncMessageVersion.V1,
        data: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic when onboarding is not completed.',
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
      expect(controller.state.pendingSecretImports).toEqual([
        {
          index: 0,
          value: '0xabc',
          type: QrSyncSecretTypes.PRIVATE_KEY,
        },
      ]);
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

      expect(controller.state.pendingSecretImports).not.toBeNull();
      expect(controller.state.provisioningMetadata).not.toBeNull();

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
    it('clears secrets and sets failed via markProvisioningFailed', async () => {
      const controller = buildController({
        getIsOnboardingCompleted: () => false,
      });
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);
      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      const metadataBeforeFailure = controller.state.provisioningMetadata;

      controller.markProvisioningFailed();

      expect(controller.state.pendingSecretImports).toBeNull();
      expect(controller.state.provisioningMetadata).toEqual(
        metadataBeforeFailure,
      );
      expect(controller.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.FAILED,
      );
    });

    it('importRemainingSecrets delegates vault imports to the provisioning service', async () => {
      const walletClient = buildMockWalletClient();
      const messenger = buildMessenger();
      const callSpy = jest
        .spyOn(messenger, 'call')
        .mockResolvedValue(undefined);

      const orchestratingController = new QrSyncController({
        messenger,
        keyManager: {} as IKeyManager,
        relayUrl: TEST_RELAY_URL,
        getIsOnboardingCompleted: () => false,
      });

      await startSession(orchestratingController, walletClient);
      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      orchestratingController.enrichPrimaryProvisioningEntry(
        'primary-entropy' as EntropySourceId,
      );
      await orchestratingController.importRemainingSecrets();

      expect(callSpy).toHaveBeenCalledWith(
        'QrSyncProvisioningService:importSecretsToVault',
        [],
      );
      expect(orchestratingController.state.provisioningStatus).toBe(
        QrSyncProvisioningStatuses.SECRETS_IMPORTED,
      );
    });

    it('importRemainingSecrets no-ops when not awaiting_password', async () => {
      const messenger = buildMessenger();
      const callSpy = jest.spyOn(messenger, 'call');

      const idleController = new QrSyncController({
        messenger,
        keyManager: {} as IKeyManager,
        relayUrl: TEST_RELAY_URL,
        getIsOnboardingCompleted: () => false,
      });

      await idleController.importRemainingSecrets();

      expect(callSpy).not.toHaveBeenCalled();
    });
  });
});
