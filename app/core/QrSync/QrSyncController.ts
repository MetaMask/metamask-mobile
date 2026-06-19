import { BaseController, type StateMetadata } from '@metamask/base-controller';

import {
  QR_SYNC_CONTROLLER_NAME,
  type QrSyncControllerErrorState,
  type QrSyncControllerMessenger,
  type QrSyncControllerReviewItemState,
  type QrSyncControllerReviewState,
  type QrSyncControllerState,
} from './controller-types';
import type {
  QrSyncConnectionStatusChangedEvent,
  QrSyncImportPlan,
  QrSyncImportReview,
  QrSyncPhaseChangedEvent,
  QrSyncPhase,
  QrSyncSyncErrorEvent,
  QrSyncSyncReadyEvent,
  QrSyncOtpDisplayGrantEvent,
  QrSyncServiceEvent,
} from './types';
import { QrSyncSession } from './services/qr-sync-session';
import { parseQrSyncConnectionRequest } from './services/qr-sync-connection-request';
import type { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
  RELAY_URL,
} from './constants';
import { routeIncomingQrSyncMessage } from './services/qr-sync-message-router';

const SYNC_OFFER_DEADLINE_MS = 5 * 60 * 1000;

const isConnectionStatusChangedEvent = (
  event: QrSyncServiceEvent,
): event is QrSyncConnectionStatusChangedEvent =>
  event.type === 'connection-status-changed';

const isOtpDisplayGrantEvent = (
  event: QrSyncServiceEvent,
): event is QrSyncOtpDisplayGrantEvent => event.type === 'otp-display-grant';

const isSyncReadyEvent = (
  event: QrSyncServiceEvent,
): event is QrSyncSyncReadyEvent => event.type === QrSyncActionTypes.SYNC_READY;

const isSyncErrorEvent = (
  event: QrSyncServiceEvent,
): event is QrSyncSyncErrorEvent => event.type === QrSyncActionTypes.SYNC_ERROR;

const isPhaseChangedEvent = (
  event: QrSyncServiceEvent,
): event is QrSyncPhaseChangedEvent => event.type === 'phase-changed';

const toControllerReviewState = (
  review: QrSyncImportReview,
): QrSyncControllerReviewState => {
  const entries: QrSyncControllerReviewItemState[] = review.entries.map(
    (entry) => ({
      ...entry,
      accountName: entry.accountName ?? null,
    }),
  );

  return {
    deadline: review.deadline,
    entries,
    summary: {
      entryCount: review.summary.entryCount,
      mnemonicCount: review.summary.mnemonicCount,
      privateKeyCount: review.summary.privateKeyCount,
      hasPrimaryMnemonic: review.summary.hasPrimaryMnemonic,
    },
  };
};

const metadata: StateMetadata<QrSyncControllerState> = {
  phase: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  connectionStatus: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  review: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  otp: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  error: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  importPlan: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

export const defaultQrSyncControllerState: QrSyncControllerState = {
  phase: QrSyncPhases.IDLE,
  connectionStatus: 'disconnected',
  review: null,
  otp: null,
  error: null,
  importPlan: null,
};

/**
 * Controller that owns serialized QR sync state and coordinates runtime helpers.
 *
 * Runtime-only objects such as `QrSyncSession` and secret-bearing import plans
 * are intentionally kept out of controller state.
 */
export class QrSyncController extends BaseController<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState,
  QrSyncControllerMessenger
> {
  private readonly keyManager: IKeyManager;

  private readonly relayUrl: string;

  private session: QrSyncSession | null = null;

  constructor({
    messenger,
    state,
    keyManager,
    relayUrl = RELAY_URL,
  }: {
    messenger: QrSyncControllerMessenger;
    state?: Partial<QrSyncControllerState>;
    keyManager: IKeyManager;
    relayUrl?: string;
  }) {
    super({
      name: QR_SYNC_CONTROLLER_NAME,
      messenger,
      metadata,
      state: {
        ...defaultQrSyncControllerState,
        ...state,
      },
    });

    this.keyManager = keyManager;
    this.relayUrl = relayUrl;
  }

  /** Sets a controller-local phase without requiring a runtime session event. */
  public setPhase(phase: QrSyncPhase): void {
    this.update((state) => {
      state.phase = phase;
    });
  }

  /**
   * Primary mobile entrypoint for QR sync.
   *
   * The UI passes the raw scanned QR string here. The controller validates the
   * payload, creates the wallet-side MWP session, attaches it, and starts the
   * connection handshake.
   */
  public async handleScannedQrPayload(scannedQrData: string): Promise<void> {
    this.resetQrSyncState();
    this.setPhase(QrSyncPhases.INITIALIZING);

    try {
      const connectionRequest = parseQrSyncConnectionRequest(scannedQrData);
      const { sessionRequest } = connectionRequest;

      const session = await QrSyncSession.create({
        sessionId: sessionRequest.id,
        keyManager: this.keyManager,
        relayUrl: this.relayUrl,
      });

      this.attachSession(session);
      await session.connect(sessionRequest);
      await this.sendSyncOffer(session);
    } catch (error) {
      this.detachSession();
      this.setRuntimeError(this.toQrSyncError(error));
    }
  }

  /** Attaches a runtime QR sync session helper to this controller. */
  public attachSession(session: QrSyncSession): void {
    this.detachSession();
    this.session = session;
    this.session.on('serviceEvent', this.handleSessionServiceEvent);
    this.session.on('message', this.handleSessionMessage);
  }

  /** Detaches the current runtime QR sync session helper, if any. */
  public detachSession(): void {
    if (!this.session) {
      return;
    }

    this.session.off('serviceEvent', this.handleSessionServiceEvent);
    this.session.off('message', this.handleSessionMessage);
    this.session = null;
  }

  /** Clears UI state and secret-bearing runtime state for a fresh QR sync flow. */
  public resetQrSyncState(): void {
    this.update((state) => {
      state.phase = defaultQrSyncControllerState.phase;
      state.connectionStatus = defaultQrSyncControllerState.connectionStatus;
      state.review = null;
      state.otp = null;
      state.error = null;
      state.importPlan = null;
    });
  }

  private readonly handleSessionMessage = (message: unknown) => {
    const routedMessage = routeIncomingQrSyncMessage(message);

    if (!routedMessage) {
      return;
    }

    if ('importPlan' in routedMessage && routedMessage.importPlan) {
      this.update((state) => {
        state.importPlan = routedMessage.importPlan as QrSyncImportPlan;
      });
    }

    this.handleSessionServiceEvent(routedMessage.event);

    if (routedMessage.event.type === QrSyncActionTypes.SYNC_READY) {
      if (!this.session) {
        throw new Error('Session not found');
      }

      this.sendSyncCompleted(this.session);
    }
  };

  private readonly handleSessionServiceEvent = (event: QrSyncServiceEvent) => {
    if (isConnectionStatusChangedEvent(event)) {
      this.update((state) => {
        state.connectionStatus = event.data.status;
        if (
          event.data.status === 'connected' &&
          state.phase !== QrSyncPhases.COMPLETED
        ) {
          state.phase = QrSyncPhases.WAITING_FOR_SYNC_READY;
        }
      });
      return;
    }

    if (isOtpDisplayGrantEvent(event)) {
      this.update((state) => {
        state.phase = QrSyncPhases.DISPLAYING_OTP;
        state.otp = event.data;
        state.error = null;
      });
      return;
    }

    if (isSyncReadyEvent(event)) {
      this.update((state) => {
        state.phase = QrSyncPhases.REVIEWING_IMPORT;
        state.review = toControllerReviewState(event.data);
        state.error = null;
      });
      return;
    }

    if (event.type === 'sync-completed') {
      this.update((state) => {
        state.phase = QrSyncPhases.COMPLETED;
        state.otp = null;
        state.error = null;
      });
      return;
    }

    if (isSyncErrorEvent(event)) {
      this.update((state) => {
        state.phase = QrSyncPhases.FAILED;
        state.error = event.data;
      });
      return;
    }

    if (isPhaseChangedEvent(event)) {
      this.update((state) => {
        state.phase = event.data.phase;
      });
    }
  };

  private async sendSyncOffer(session: QrSyncSession): Promise<void> {
    this.update((state) => {
      state.otp = null;
      state.phase = QrSyncPhases.WAITING_FOR_SYNC_READY;
    });

    await session.send({
      type: QrSyncActionTypes.SYNC_OFFER,
      version: QrSyncMessageVersion.V1,
      data: {
        sessionId: this.session?.id,
        deadline: Date.now() + SYNC_OFFER_DEADLINE_MS,
      },
    });
  }

  private async sendSyncCompleted(session: QrSyncSession): Promise<void> {
    await session.send({
      type: QrSyncActionTypes.SYNC_COMPLETED,
      version: QrSyncMessageVersion.V1,
    });
  }

  private setRuntimeError(error: QrSyncControllerErrorState): void {
    this.update((state) => {
      state.phase = QrSyncPhases.FAILED;
      state.error = error;
    });
  }

  private toQrSyncError(error: unknown): QrSyncControllerErrorState {
    const message = error instanceof Error ? error.message : String(error);

    return {
      code: 'INVALID_PAYLOAD',
      message,
      retryable: false,
    };
  }
}
