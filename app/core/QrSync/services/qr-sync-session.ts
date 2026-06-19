import EventEmitter from 'eventemitter2';
import {
  type IKeyManager,
  type SessionRequest,
  SessionStore,
  WebSocketTransport,
} from '@metamask/mobile-wallet-protocol-core';
import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';

import {
  QrSyncActionTypes,
  QrSyncServiceEventTypes,
  RELAY_URL,
} from '../constants';
import {
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncServiceEvent,
  QrSyncWireMessage,
} from '../types';
import { KVStore } from '../../SDKConnectV2/store/kv-store';

interface QrSyncSessionConfig {
  sessionId: string;
  keyManager: IKeyManager;
  relayUrl?: string;
}

interface QrSyncSessionEvents {
  serviceEvent: (event: QrSyncServiceEvent) => void;
  message: (message: unknown) => void;
}

/**
 * Runtime helper that owns one encrypted MWP session used by QR sync.
 *
 * This helper is intended to be owned by `QrSyncController` as a private field.
 * It only manages transport/client lifecycle and re-emits runtime events. It
 * intentionally does not own controller state, routing, validation, or import
 * orchestration.
 */
export class QrSyncSession extends EventEmitter {
  public readonly id: string;

  public readonly client: WalletClient;

  private previousConnectionStatus: QrSyncConnectionStatus = 'disconnected';

  private constructor(sessionId: string, client: WalletClient) {
    super();

    this.id = sessionId;
    this.client = client;

    this.client.on('display_otp', (otp, deadline) => {
      this.emit('serviceEvent', {
        type: QrSyncActionTypes.OTP_DISPLAY_GRANT,
        data: { otp, deadline },
      } satisfies QrSyncServiceEvent);
    });

    this.client.on('connected', () => {
      // Wallet-client `connected` fires after the extension verifies OTP (handshake_ack).
      this.emitConnectionStatus('connected');
    });

    this.client.on('disconnected', () => {
      this.emitConnectionStatus('disconnected');
    });

    this.client.on('message', (message) => {
      this.emit('message', message);
    });

    this.client.on('error', (error) => {
      this.emitConnectionStatus('errored');
      this.emit('serviceEvent', {
        type: QrSyncActionTypes.SYNC_ERROR,
        data: this.toQrSyncError(error),
      } satisfies QrSyncServiceEvent);
    });
  }

  public static async create({
    sessionId,
    keyManager,
    relayUrl = RELAY_URL,
  }: QrSyncSessionConfig): Promise<QrSyncSession> {
    const transport = await WebSocketTransport.create({
      url: relayUrl,
      kvstore: new KVStore(`qr-sync/transport/${sessionId}`),
      useSharedConnection: true,
    });
    const sessionStore = await SessionStore.create(
      new KVStore(`qr-sync/session-store/${sessionId}`),
    );
    const client = new WalletClient({
      transport,
      sessionstore: sessionStore,
      keymanager: keyManager,
    });

    return new QrSyncSession(sessionId, client);
  }

  public on(
    event: 'serviceEvent',
    listener: QrSyncSessionEvents['serviceEvent'],
  ): this;
  public on(event: 'message', listener: QrSyncSessionEvents['message']): this;
  public on(
    event: 'serviceEvent' | 'message',
    listener:
      | QrSyncSessionEvents['serviceEvent']
      | QrSyncSessionEvents['message'],
  ): this {
    super.on(event, listener);
    return this;
  }

  public off(
    event: 'serviceEvent',
    listener: QrSyncSessionEvents['serviceEvent'],
  ): this;
  public off(event: 'message', listener: QrSyncSessionEvents['message']): this;
  public off(
    event: 'serviceEvent' | 'message',
    listener:
      | QrSyncSessionEvents['serviceEvent']
      | QrSyncSessionEvents['message'],
  ): this {
    super.off(event, listener);
    return this;
  }

  /** Connects a fresh QR sync session. */
  public async connect(sessionRequest: SessionRequest): Promise<void> {
    this.emitConnectionStatus('connecting');
    await this.client.connect({ sessionRequest });
  }

  /** Resumes an existing QR sync session. */
  public async resume(): Promise<void> {
    this.emitConnectionStatus('reconnecting');
    await this.client.resume(this.id);
  }

  /** Sends a typed protocol payload to the remote QR sync peer. */
  public async send(message: QrSyncWireMessage): Promise<void> {
    await this.client.sendResponse(message);
  }

  /** Disconnects the logical QR sync session. */
  public async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  private emitConnectionStatus(status: QrSyncConnectionStatus): void {
    const previousStatus = this.previousConnectionStatus;
    this.previousConnectionStatus = status;

    this.emit('serviceEvent', {
      type: QrSyncServiceEventTypes.CONNECTION_STATUS_CHANGED,
      data: {
        status,
        previousStatus,
      },
    } satisfies QrSyncServiceEvent);
  }

  private toQrSyncError(error: Error): QrSyncError {
    return {
      code: 'SYNC_FAILED',
      message: error.message,
      retryable: false,
    };
  }
}
