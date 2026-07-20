import type { EntropySourceId } from '@metamask/keyring-api';
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
} from './constants';

/** Secret entry kinds (`sync-ready` wire payload and mobile controller state). */
export type QrSyncSecretType =
  (typeof QrSyncSecretTypes)[keyof typeof QrSyncSecretTypes];

// --- Session lifecycle and protocol ---

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
export const QrSyncErrorCodes = {
  CHANNEL_INIT_FAILED: 'CHANNEL_INIT_FAILED',
  CHANNEL_DISCONNECTED: 'CHANNEL_DISCONNECTED',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SYNC_REJECTED: 'SYNC_REJECTED',
  SYNC_FAILED: 'SYNC_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type QrSyncErrorCode =
  (typeof QrSyncErrorCodes)[keyof typeof QrSyncErrorCodes];

/** Structured QR sync error surfaced to services and UI bridges. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncError = {
  code: QrSyncErrorCode;
  message: string;
};

/** Validated QR entry payload used to start a mobile wallet-side MWP session. */
export interface QrSyncConnectionRequest {
  sessionRequest: SessionRequest;
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
export interface QrSyncSyncReadyMessage {
  type: typeof QrSyncActionTypes.SYNC_READY;
  version: QrSyncMessageVersion;
  deadline: number;
  data: QrSyncReadyData[];
}

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

/** Service event emitted when a validated import payload is ready for execution. */
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

// --- Provisioning (wire payload, secrets, persisted metadata) ---

/** Pin/hide flags shared by account groups and private-key entries. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncPinHideFlags = {
  pinned?: boolean;
  hidden?: boolean;
};

/** Correlates wire, ephemeral secret, and persisted metadata entries. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncIndexedEntry = {
  index: number;
};

/**
 * Account group metadata (wire and persisted).
 * Aligns with `AccountTreeGroupMetadata.name` and `entropy.groupIndex`.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncAccountGroup = {
  groupIndex: number;
  name: string;
} & QrSyncPinHideFlags;

/**
 * Extension `sync-ready` import payload (v1).
 *
 * `name` on a mnemonic entry is the wallet name (`AccountTreeWalletMetadata.name`).
 * `groups[].name` is each account group name (`AccountTreeGroupMetadata.name`).
 * On a private-key entry, `name` is the imported account group name.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncReadyMnemonicData = {
  type: typeof QrSyncSecretTypes.MNEMONIC;
  mnemonic: string;
  name?: string;
  groups?: QrSyncAccountGroup[];
  isPrimary?: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncReadyPrivateKeyData = {
  type: typeof QrSyncSecretTypes.PRIVATE_KEY;
  privateKey: string;
  name: string;
} & QrSyncPinHideFlags;

export type QrSyncReadyData =
  | QrSyncReadyMnemonicData
  | QrSyncReadyPrivateKeyData;

/** Ephemeral secret material held until password import. Never persisted. */
export type QrSyncSecretImportEntry = QrSyncIndexedEntry & {
  type: QrSyncSecretType;
  value: string;
  /** Whether the SRP (Mnemonic) secret is the primary secret for the wallet. */
  isPrimary?: boolean;
};

/** Persisted mnemonic provisioning entry (no secret material). */
export type QrSyncProvisioningMnemonicEntry = QrSyncIndexedEntry & {
  type: typeof QrSyncSecretTypes.MNEMONIC;
  isPrimary?: boolean;
  name?: string;
  groups?: QrSyncAccountGroup[];
  /** Set after vault import; maps entry to MultichainAccountService / account tree. */
  entropySource?: EntropySourceId;
};

/** Persisted private-key provisioning entry (no secret material). */
export type QrSyncProvisioningPrivateKeyEntry = QrSyncIndexedEntry & {
  type: typeof QrSyncSecretTypes.PRIVATE_KEY;
  name: string;
  /** Set after vault import; used to resolve the account-tree group. */
  accountAddress?: string;
} & QrSyncPinHideFlags;

export type QrSyncProvisioningEntry =
  | QrSyncProvisioningMnemonicEntry
  | QrSyncProvisioningPrivateKeyEntry;

/** Persisted provisioning plan (no secret material). */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncProvisioningMetadata = {
  version: QrSyncMessageVersion;
  entries: QrSyncProvisioningEntry[];
};

/** Persisted provisioning pipeline status for QR sync vault import. */
export type QrSyncProvisioningStatus =
  (typeof QrSyncProvisioningStatuses)[keyof typeof QrSyncProvisioningStatuses];

/** Phase B secret-import preconditions used by the QR sync controller. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface QrSyncSecretImportPreconditions {
  provisioningStatus: QrSyncProvisioningStatus | null;
  pendingSecretImports: QrSyncSecretImportEntry[] | null;
}

/** Phase B enrichment context: secret-import preconditions plus persisted metadata. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface QrSyncProvisioningEntryEnrichmentContext
  extends QrSyncSecretImportPreconditions {
  provisioningMetadata: QrSyncProvisioningMetadata | null;
}

/** Resolved provisioning metadata entry for Phase B enrichment. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface QrSyncProvisioningEntryResolution {
  entryIndex: number;
  entry: QrSyncProvisioningEntry;
}
