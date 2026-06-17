import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import { QrSyncActionTypes, QrSyncMessageVersion } from './constants';

/** Mobile-local lifecycle state for one QR sync session. */
export type QrSyncPhase =
  | 'idle'
  | 'initializing'
  | 'waiting-for-connection'
  | 'waiting-for-otp-grant'
  | 'displaying-otp'
  | 'waiting-for-sync-ready'
  | 'reviewing-import'
  | 'importing'
  | 'completed'
  | 'cancelled'
  | 'failed';

/** Transport-level connection state for the encrypted MWP session. */
export type QrSyncConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'errored';

/** All supported QR sync protocol action names. */
export type QrSyncActionType =
  (typeof QrSyncActionTypes)[keyof typeof QrSyncActionTypes];

/** Generic wire envelope exchanged between QR sync peers. */
export interface QrSyncMessage<DataType = undefined> {
  type: QrSyncActionType;
  version: QrSyncMessageVersion;
  data?: DataType;
}

/** Secret kinds supported by QR sync import payloads. */
export type SyncDataType = 'MNEMONIC' | 'PRIVATE_KEY';

/** Optional metadata attached to one imported secret. */
export interface QrSyncSecretMetadata {
  accountName?: string;
  hiddenIndexes?: number[];
  isPrimary?: boolean;
}

/** Sanitized account candidate shown in a sync offer review. */
export interface QrSyncAccountCandidate {
  id: string;
  address: string;
  name?: string;
  type: SyncDataType;
  metadata?: QrSyncSecretMetadata;
}

/** Mobile-generated offer sent to the extension for selection/review. */
export interface QrSyncOffer {
  sessionId?: string;
  deadline: number;
  accounts: QrSyncAccountCandidate[];
}

/** Stable error codes shared across QR sync validation and runtime errors. */
export type QrSyncErrorCode =
  | 'CHANNEL_INIT_FAILED'
  | 'CHANNEL_DISCONNECTED'
  | 'INVALID_PAYLOAD'
  | 'UNSUPPORTED_VERSION'
  | 'SESSION_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'IMPORT_FAILED'
  | 'USER_CANCELLED'
  | 'SYNC_REJECTED'
  | 'SYNC_FAILED'
  | 'UNKNOWN';

/** Structured QR sync error surfaced to services and UI bridges. */
export interface QrSyncError {
  code: QrSyncErrorCode;
  message: string;
  retryable: boolean;
}

/**
 * The data payload for the sync action.
 * This is the data that is sent to the mobile wallet client.
 * The mobile will use this decrypted data to perform the sync operation.
 *
 * During the sync operation, this data is encrypted together with the parent payload. (i.e. `SYNC_READY` payload)
 *
 * @type {object}
 */
export interface QrSyncDataEntry {
  /**
   * The decrypted account or wallet secret value.
   *
   * This can be a mnemonic or private key depending on the entry type.
   *
   * @type {string}
   */
  value: string;
  type: SyncDataType;
  metadata?: QrSyncSecretMetadata;
}

/** Decrypted `sync-ready` payload before mobile validation/normalization. */
export interface QrSyncData {
  data: QrSyncDataEntry[];
  deadline: number;
}

/** Validated QR entry payload used to start a mobile wallet-side MWP session. */
export interface QrSyncConnectionRequest {
  sessionRequest: SessionRequest;
}

/** One normalized import entry used by mobile import orchestration. */
export interface QrSyncImportPlanEntry {
  index: number;
  value: string;
  type: SyncDataType;
  accountName?: string;
  hiddenIndexes: number[];
  isPrimary: boolean;
}

/** Validated import plan used by the mobile import service. */
export interface QrSyncImportPlan {
  deadline: number;
  entries: QrSyncImportPlanEntry[];
  primaryMnemonic?: QrSyncImportPlanEntry;
  mnemonicEntries: QrSyncImportPlanEntry[];
  privateKeyEntries: QrSyncImportPlanEntry[];
}

/** Review-safe import entry with secret material removed for UI use. */
export type QrSyncImportReviewItem = Omit<QrSyncImportPlanEntry, 'value'>;

/** Aggregate counts shown alongside the import review UI. */
export interface QrSyncImportReviewSummary {
  entryCount: number;
  mnemonicCount: number;
  privateKeyCount: number;
  hasPrimaryMnemonic: boolean;
}

/** Sanitized review model emitted to UI before import execution begins. */
export interface QrSyncImportReview {
  deadline: number;
  entries: QrSyncImportReviewItem[];
  summary: QrSyncImportReviewSummary;
}

/** Wire message used to bootstrap a QR sync session. */
export type QrSyncInitSyncSessionMessage = QrSyncMessage & {
  type: typeof QrSyncActionTypes.INIT_SYNC_SESSION;
};

/** Wire message that tells mobile it may now display the OTP. */
export type QrSyncOtpDisplayGrantMessage = QrSyncMessage & {
  type: typeof QrSyncActionTypes.OTP_DISPLAY_GRANT;
};

/** Wire message sent by mobile to present account candidates to extension. */
export type QrSyncSyncOfferMessage = QrSyncMessage<QrSyncOffer> & {
  type: typeof QrSyncActionTypes.SYNC_OFFER;
  data: QrSyncOffer;
};

/** Wire message sent by extension with decrypted import payload data. */
export type QrSyncSyncReadyMessage = QrSyncMessage<QrSyncData> & {
  type: typeof QrSyncActionTypes.SYNC_READY;
  data: QrSyncData;
};

/** Wire message that marks successful completion of the QR sync flow. */
export type QrSyncSyncCompletedMessage = QrSyncMessage & {
  type: typeof QrSyncActionTypes.SYNC_COMPLETED;
};

/** Wire message that carries a protocol/runtime error between peers. */
export type QrSyncSyncErrorMessage = QrSyncMessage<QrSyncError> & {
  type: typeof QrSyncActionTypes.SYNC_ERROR;
  data: QrSyncError;
};

/** All peer-to-peer protocol messages exchanged over the encrypted MWP session. */
export type QrSyncWireMessage =
  | QrSyncInitSyncSessionMessage
  | QrSyncOtpDisplayGrantMessage
  | QrSyncSyncOfferMessage
  | QrSyncSyncReadyMessage
  | QrSyncSyncCompletedMessage
  | QrSyncSyncErrorMessage;

/** OTP details emitted when the protocol allows mobile to display the code. */
export interface QrSyncOtpDisplay {
  otp: string;
  deadline: number;
}

/** Minimal controller state suitable for Redux or another UI state bridge. */
export interface QrSyncState {
  phase: QrSyncPhase;
  connectionStatus: QrSyncConnectionStatus;
  review?: QrSyncImportReview;
  otp?: QrSyncOtpDisplay;
  error?: QrSyncError;
}

/** Service event emitted when the mobile session phase changes. */
export interface QrSyncPhaseChangedEvent {
  type: 'phase-changed';
  data: {
    phase: QrSyncPhase;
    previousPhase: QrSyncPhase;
  };
}

/** Service event emitted when transport connectivity changes. */
export interface QrSyncConnectionStatusChangedEvent {
  type: 'connection-status-changed';
  data: {
    status: QrSyncConnectionStatus;
    previousStatus: QrSyncConnectionStatus;
  };
}

/** Service event emitted when UI should display the OTP code. */
export interface QrSyncOtpDisplayGrantEvent {
  type: typeof QrSyncActionTypes.OTP_DISPLAY_GRANT;
  data: QrSyncOtpDisplay;
}

/** Service event emitted when UI should review a normalized import payload. */
export interface QrSyncSyncReadyEvent {
  type: typeof QrSyncActionTypes.SYNC_READY;
  data: QrSyncImportReview;
}

/** Service event emitted when the QR sync flow finishes successfully. */
export interface QrSyncSyncCompletedEvent {
  type: typeof QrSyncActionTypes.SYNC_COMPLETED;
}

/** Service event emitted when the QR sync flow fails or is rejected. */
export interface QrSyncSyncErrorEvent {
  type: typeof QrSyncActionTypes.SYNC_ERROR;
  data: QrSyncError;
}

/**
 * Internal service events consumed by UI bridges or state adapters.
 *
 * These are intentionally separate from {@link QrSyncMessage}, which models
 * peer-to-peer protocol messages exchanged over the encrypted MWP session.
 */
export type QrSyncServiceEvent =
  | QrSyncPhaseChangedEvent
  | QrSyncConnectionStatusChangedEvent
  | QrSyncOtpDisplayGrantEvent
  | QrSyncSyncReadyEvent
  | QrSyncSyncCompletedEvent
  | QrSyncSyncErrorEvent;
