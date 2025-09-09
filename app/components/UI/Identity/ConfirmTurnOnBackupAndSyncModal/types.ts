export interface ConfirmTurnOnBackupAndSyncModalParams {
  enableBackupAndSync: () => Promise<void>;
  trackEnableBackupAndSyncEvent: () => void;
}
