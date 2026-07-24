export const RELAY_URL =
  'wss://mm-sdk-relay.api.cx.metamask.io/connection/websocket';

export enum QrSyncMessageVersion {
  V1 = '1.0.0',
}

/**
 * Mobile-local lifecycle phases for one QR sync session.
 *
 * Each phase maps to a distinct UI moment in the add-device flow:
 * - idle → no active session
 * - initializing → validating QR payload and opening the MWP session
 * - displaying-otp → verification bottom sheet is shown
 * - awaiting-sync-ready → OTP verified and sync-offer sent; waiting for extension sync-ready
 * - reviewing-import → import payload received; onboarding import screen
 * - completed / failed → terminal outcomes
 */
export const QrSyncPhases = {
  IDLE: 'idle',
  /** Validating QR payload and opening the wallet-client connection. */
  INITIALIZING: 'initializing',
  /** OTP is available; verification bottom sheet should be shown. */
  DISPLAYING_OTP: 'displaying-otp',
  /** Sync-offer sent; waiting for sync-ready from the extension. */
  AWAITING_SYNC_READY: 'awaiting-sync-ready',
  /** Import payload received; navigate to onboarding import. */
  REVIEWING_IMPORT: 'reviewing-import',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

/** Distinguishes new-user vs existing-user QR sync receive paths. */
export const QrSyncSyncFlows = {
  NEW_USER: 'new_user',
  EXISTING_USER: 'existing_user',
} as const;

export type QrSyncSyncFlow =
  (typeof QrSyncSyncFlows)[keyof typeof QrSyncSyncFlows];

/**
 * Persisted provisioning pipeline status for QR sync vault import.
 *
 * - awaiting_password — secrets held in memory until the user sets a password
 * - secrets_imported — vault import done; metadata layout (QrSync Phase C) pending
 * - completed — provisioning finished; metadata cleared
 * - failed — Phase C failed; metadata retained for potential retry
 */
export const QrSyncProvisioningStatuses = {
  AWAITING_PASSWORD: 'awaiting_password', // NOSONAR - this is not password. False positive.
  SECRETS_IMPORTED: 'secrets_imported',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const QrSyncActionTypes = {
  /**
   * Init Sync Session
   *
   * This action is used to initialize a sync session by
   * sending the initial payload to the Mobile Wallet Client via the WebSocket.
   *
   * @type {string}
   */
  INIT_SYNC_SESSION: 'init-sync-session',

  /**
   * OTP Display Grant
   *
   * This action is used by the **EXTENSION** to request the connected mobile wallet client to display an OTP.
   * The mobile wallet client will only then display the OTP and user will have to enter the OTP
   * in the extension to complete the sync session establishment.
   *
   * @type {string}
   */
  OTP_DISPLAY_GRANT: 'otp-display-grant',

  /**
   * Sync Offer
   *
   * This action is used by **MOBILE** to send the sync offer to the extension via the WebSocket.
   * Upon receiving the sync offer, the extension will show the available accounts to the user to begin the sync.
   *
   * @type {string}
   */
  SYNC_OFFER: 'sync-offer',

  /**
   * Sync Ready
   *
   * This action is used by **EXTENSION** to notify the connected mobile wallet client that the sync is ready to begin.
   * Additionally, the extension will also send the SyncAccountData to the mobile wallet client.
   *
   * @type {string}
   */
  SYNC_READY: 'sync-ready',

  /**
   * Sync Completed
   *
   * This action is used by **MOBILE** to notify the extension that the sync has been completed.
   *
   * @type {string}
   */
  SYNC_COMPLETED: 'sync-completed',

  /**
   * Sync Cancel
   *
   * Sent when a participant explicitly cancels an in-progress sync session.
   *
   * @type {string}
   */
  SYNC_CANCEL: 'sync-cancel',

  /**
   * Sync Error
   *
   * This action is used to notify the any participant that the sync has encountered an error.
   * Both mobile and extension can send this action.
   *
   * @type {string}
   */
  SYNC_ERROR: 'sync-error',
} as const;

/**
 * Secret entry `type` values in the `sync-ready` payload and mobile controller state.
 */
export const QrSyncSecretTypes = {
  MNEMONIC: 'Mnemonic',
  PRIVATE_KEY: 'PrivateKey',
} as const;
