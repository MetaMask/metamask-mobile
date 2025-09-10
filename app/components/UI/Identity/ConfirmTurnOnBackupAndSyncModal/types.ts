export interface ConfirmTurnOnBackupAndSyncModalParams {
  enableBackupAndSync: () => Promise<void>;
  trackEnableBackupAndSyncEvent: (newValue: boolean) => void;
}
