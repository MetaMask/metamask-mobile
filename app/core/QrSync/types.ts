import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
} from './constants';

/** Mobile-local lifecycle state for one QR sync session. */
export type QrSyncPhase = (typeof QrSyncPhases)[keyof typeof QrSyncPhases];

/** Transport-level connection state for the encrypted MWP session. */
export type QrSyncConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
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

/** Mobile-generated offer sent to the extension for selection/review. */
export interface QrSyncOffer {
  sessionId?: string;
  /** Whether the user has completed mobile onboarding at offer-send time. */
  isOnboardingCompleted: boolean;
}

/**
 * Stable error codes shared across QR sync validation and runtime errors.
 *
 * - `CHANNEL_INIT_FAILED` — wallet client creation, connect, or handshake setup failed
 * - `CHANNEL_DISCONNECTED` — MWP session lost or unavailable while in progress
 * - `INVALID_PAYLOAD` — scan payload, wire message, or import data failed validation
 * - `UNSUPPORTED_VERSION` — peer message uses an unsupported protocol version
 * - `SESSION_EXPIRED` — scanned session request or sync-ready deadline has expired
 * - `SYNC_REJECTED` — extension explicitly rejected the sync (peer-originated)
 * - `SYNC_FAILED` — unexpected runtime or wallet-client failure during an active session
 */
export type QrSyncErrorCode =
  | 'CHANNEL_INIT_FAILED'
  | 'CHANNEL_DISCONNECTED'
  | 'INVALID_PAYLOAD'
  | 'UNSUPPORTED_VERSION'
  | 'SESSION_EXPIRED'
  | 'SYNC_REJECTED'
  | 'SYNC_FAILED';

/** Structured QR sync error surfaced to services and UI bridges. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncError = {
  code: QrSyncErrorCode;
  message: string;
};

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

/** One normalized import entry without secret material. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncImportEntry = {
  index: number;
  type: SyncDataType;
  accountName: string | null;
  hiddenIndexes: number[];
  isPrimary: boolean;
};

/** One normalized import entry used by mobile import orchestration. */
export type QrSyncImportPlanEntry = QrSyncImportEntry & {
  value: string;
};

/** Validated import plan used by the mobile import service. */
export type QrSyncImportPlan = QrSyncImportPlanEntry[];

/** Strips secret values from an import plan for UI-safe review. */
export const stripQrSyncImportSecrets = (
  plan: QrSyncImportPlan,
): QrSyncImportEntry[] => plan.map(({ value: _value, ...entry }) => entry);

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

/** Wire message that marks explicit cancellation of the QR sync flow. */
export type QrSyncSyncCancelMessage = QrSyncMessage & {
  type: typeof QrSyncActionTypes.SYNC_CANCEL;
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
  | QrSyncSyncCancelMessage
  | QrSyncSyncErrorMessage;

/** OTP details emitted when the protocol allows mobile to display the code. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncOtpDisplay = {
  otp: string;
  deadline: number;
};

/** Service event emitted when UI should display the OTP code. */
export interface QrSyncOtpDisplayGrantEvent {
  type: typeof QrSyncActionTypes.OTP_DISPLAY_GRANT;
  data: QrSyncOtpDisplay;
}

/** Service event emitted when a validated import plan is ready for execution. */
export interface QrSyncSyncReadyEvent {
  type: typeof QrSyncActionTypes.SYNC_READY;
}

/** Service event emitted when the QR sync flow finishes successfully. */
export interface QrSyncSyncCompletedEvent {
  type: typeof QrSyncActionTypes.SYNC_COMPLETED;
}

/** Service event emitted when the QR sync flow is cancelled by a peer. */
export interface QrSyncSyncCancelledEvent {
  type: typeof QrSyncActionTypes.SYNC_CANCEL;
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
  | QrSyncOtpDisplayGrantEvent
  | QrSyncSyncReadyEvent
  | QrSyncSyncCompletedEvent
  | QrSyncSyncCancelledEvent
  | QrSyncSyncErrorEvent;
