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
import type { QrSyncData, QrSyncDataEntry, QrSyncMessage } from './types';

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
const SYNC_OFFER_DEADLINE_MS = 5 * 60 * 1000;

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
  mode: 'trusted',
  expiresAt: Date.now() + 600_000,
  ...overrides,
});

const createSyncReadyWireMessage = (
  options: { isPrimary?: boolean } = {},
): QrSyncMessage<QrSyncData> => {
  const entry: QrSyncDataEntry = {
    value: encodeSecret('word1 word2 word3'),
    type: 'MNEMONIC',
    ...(options.isPrimary === false ? {} : { metadata: { isPrimary: true } }),
  };

  return {
    type: QrSyncActionTypes.SYNC_READY,
    version: QrSyncMessageVersion.V1,
    data: {
      deadline: Date.now() + 60_000,
      data: [entry],
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

interface MockWalletClientHarness {
  client: jest.Mocked<WalletClient>;
  emit: (event: string, ...args: unknown[]) => void;
}

const buildMockWalletClient = (): MockWalletClientHarness => {
  const listeners = new Map<string, Set<WalletClientListener>>();

  const client = {
    on: jest.fn((event: string, listener: WalletClientListener) => {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    }),
    off: jest.fn((event: string, listener: WalletClientListener) => {
      listeners.get(event)?.delete(listener);
    }),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    sendResponse: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WalletClient>;

  return {
    client,
    emit: (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((listener) => {
        listener(...args);
      });
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
  createMwpDeeplink(
    encodeBase64Json({ sessionRequest: createSessionRequest() }),
  );

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
          deadline: FIXED_NOW + SYNC_OFFER_DEADLINE_MS,
          isOnboardingCompleted: true,
        },
      });
      expect(controller.state.phase).toBe(QrSyncPhases.AWAITING_SYNC_READY);
      expect(controller.state.connectionStatus).toBe('connecting');
    });

    it('enters failed phase with INVALID_PAYLOAD when the scan payload cannot be parsed', async () => {
      const controller = buildController();

      await controller.handleScannedQrPayload('not-a-deeplink');
      await flushPromises();

      expect(mockCreateQrSyncWalletClient).not.toHaveBeenCalled();
      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'INVALID_PAYLOAD',
        message: 'QR sync scan payload is not valid JSON.',
        retryable: false,
      });
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
        code: 'INVALID_PAYLOAD',
        message: 'Relay unavailable',
        retryable: false,
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
    it('stores OTP details when the client emits display_otp', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('display_otp', '123456', FIXED_NOW + 30_000);

      expect(controller.state.phase).toBe(QrSyncPhases.DISPLAYING_OTP);
      expect(controller.state.otp).toEqual({
        otp: '123456',
        deadline: FIXED_NOW + 30_000,
      });
    });

    it('sends a second sync-offer after OTP verification when the client connects', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);
      walletClient.client.sendResponse.mockClear();

      walletClient.emit('display_otp', '123456', FIXED_NOW + 30_000);
      walletClient.emit('connected');
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.AWAITING_SYNC_READY);
      expect(controller.state.connectionStatus).toBe('connected');
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_OFFER,
        version: QrSyncMessageVersion.V1,
        data: {
          sessionId: VALID_SESSION_ID,
          deadline: FIXED_NOW + SYNC_OFFER_DEADLINE_MS,
          isOnboardingCompleted: false,
        },
      });
    });

    it('stores import plan and completes the session after sync-ready message', async () => {
      const controller = buildController();
      const walletClient = buildMockWalletClient();

      await startSession(controller, walletClient);

      walletClient.emit('message', createSyncReadyWireMessage());
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.COMPLETED);
      expect(controller.state.importPlan).toEqual([
        {
          index: 0,
          value: 'word1 word2 word3',
          type: 'MNEMONIC',
          accountName: null,
          hiddenIndexes: [],
          isPrimary: true,
        },
      ]);
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
        createSyncReadyWireMessage({ isPrimary: false }),
      );
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.FAILED);
      expect(controller.state.error).toEqual({
        code: 'INVALID_PAYLOAD',
        message:
          'QR sync payload must include a primary mnemonic when onboarding is not completed.',
        retryable: false,
      });
      expect(controller.state.importPlan).toBeNull();
      expect(walletClient.client.sendResponse).toHaveBeenCalledWith({
        type: QrSyncActionTypes.SYNC_ERROR,
        version: QrSyncMessageVersion.V1,
        data: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic when onboarding is not completed.',
          retryable: false,
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
        createSyncReadyWireMessage({ isPrimary: false }),
      );
      await flushPromises();

      expect(controller.state.phase).toBe(QrSyncPhases.COMPLETED);
      expect(controller.state.importPlan).toEqual([
        {
          index: 0,
          value: 'word1 word2 word3',
          type: 'MNEMONIC',
          accountName: null,
          hiddenIndexes: [],
          isPrimary: false,
        },
      ]);
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
        retryable: false,
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
        retryable: true,
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
        retryable: false,
      });
    });
  });
});
