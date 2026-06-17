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
import { QrSyncActionTypes, RELAY_URL } from './constants';
import { routeIncomingQrSyncMessage } from './services/qr-sync-message-router';

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
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
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
};

export const defaultQrSyncControllerState: QrSyncControllerState = {
  phase: 'idle',
  connectionStatus: 'disconnected',
  review: null,
  otp: null,
  error: null,
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

  private currentImportPlan: QrSyncImportPlan | null = null;

  private readonly handleSessionMessage = (message: unknown) => {
    const routedMessage = routeIncomingQrSyncMessage(message);

    if ('importPlan' in routedMessage && routedMessage.importPlan) {
      this.setImportPlan(routedMessage.importPlan);
    }

    this.handleSessionServiceEvent(routedMessage.event);
  };

  private readonly handleSessionServiceEvent = (event: QrSyncServiceEvent) => {
    if (isConnectionStatusChangedEvent(event)) {
      this.update((state) => {
        state.connectionStatus = event.data.status;
        if (event.data.status === 'connected' && state.phase !== 'completed') {
          state.phase = 'waiting-for-sync-ready';
        }
      });
      return;
    }

    if (isOtpDisplayGrantEvent(event)) {
      this.update((state) => {
        state.phase = 'displaying-otp';
        state.otp = event.data;
        state.error = null;
      });
      return;
    }

    if (isSyncReadyEvent(event)) {
      this.update((state) => {
        state.phase = 'reviewing-import';
        state.review = toControllerReviewState(event.data);
        state.error = null;
      });
      return;
    }

    if (event.type === 'sync-completed') {
      this.update((state) => {
        state.phase = 'completed';
        state.otp = null;
        state.error = null;
      });
      return;
    }

    if (isSyncErrorEvent(event)) {
      this.update((state) => {
        state.phase = 'failed';
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

  /** Stores the active import plan outside controller state because it contains secrets. */
  public setImportPlan(plan: QrSyncImportPlan | null): void {
    this.currentImportPlan = plan;
  }

  /** Returns the current secret-bearing import plan for internal orchestration use only. */
  public getImportPlan(): QrSyncImportPlan | null {
    return this.currentImportPlan;
  }

  /** Updates the review model exposed to UI. */
  public setReview(review: QrSyncControllerReviewState | null): void {
    this.update((state) => {
      state.review = review;
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
    this.setPhase('initializing');

    try {
      const connectionRequest = parseQrSyncConnectionRequest(scannedQrData);
      const { sessionRequest } = connectionRequest;

      const session = await QrSyncSession.create({
        sessionId: sessionRequest.id,
        keyManager: this.keyManager,
        relayUrl: this.relayUrl,
      });

      this.attachSession(session);
      this.setPhase('waiting-for-otp-grant');
      await session.connect(sessionRequest);
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
    this.currentImportPlan = null;

    this.update((state) => {
      state.phase = defaultQrSyncControllerState.phase;
      state.connectionStatus = defaultQrSyncControllerState.connectionStatus;
      state.review = null;
      state.otp = null;
      state.error = null;
    });
  }

  private setRuntimeError(error: QrSyncControllerErrorState): void {
    this.update((state) => {
      state.phase = 'failed';
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
