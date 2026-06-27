import type { EntropySourceId } from '@metamask/keyring-api';
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncPhases,
} from './constants';

/** Mobile secret / provisioning entry kinds. */
export type SyncDataType = 'MNEMONIC' | 'PRIVATE_KEY';

/**
 * Shared schema version for extension sync-ready payloads and persisted
 * provisioning metadata.
 */
export type QrSyncSchemaVersion = 1;

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
export type QrSyncSyncReadyMessage = QrSyncMessage<QrSyncReadyPayload> & {
  type: typeof QrSyncActionTypes.SYNC_READY;
  data: QrSyncReadyPayload;
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
  type: 'Mnemonic';
  mnemonic: string;
  name?: string;
  groups?: QrSyncAccountGroup[];
  isPrimary?: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncReadyPrivateKeyData = {
  type: 'PrivateKey';
  privateKey: string;
  name: string;
} & QrSyncPinHideFlags;

export type QrSyncReadyData =
  | QrSyncReadyMnemonicData
  | QrSyncReadyPrivateKeyData;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncReadyPayload = {
  version: QrSyncSchemaVersion;
  deadline: number;
  data: QrSyncReadyData[];
};

/** Ephemeral secret material held until password import. Never persisted. */
export type QrSyncSecretImportEntry = QrSyncIndexedEntry & {
  type: SyncDataType;
  value: string;
  /** Whether the SRP (Mnemonic) secret is the primary secret for the wallet. */
  isPrimary?: boolean;
};

/** Persisted mnemonic provisioning entry (no secret material). */
export type QrSyncProvisioningMnemonicEntry = QrSyncIndexedEntry & {
  type: Extract<SyncDataType, 'MNEMONIC'>;
  isPrimary?: boolean;
  name?: string;
  groups?: QrSyncAccountGroup[];
  /** Set after vault import; maps entry to MultichainAccountService / account tree. */
  entropySource?: EntropySourceId;
};

/** Persisted private-key provisioning entry (no secret material). */
export type QrSyncProvisioningPrivateKeyEntry = QrSyncIndexedEntry & {
  type: Extract<SyncDataType, 'PRIVATE_KEY'>;
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
  version: QrSyncSchemaVersion;
  entries: QrSyncProvisioningEntry[];
};

export type QrSyncProvisioningStatus =
  | 'awaiting_password'
  | 'secrets_imported'
  | 'completed'
  | 'failed';
