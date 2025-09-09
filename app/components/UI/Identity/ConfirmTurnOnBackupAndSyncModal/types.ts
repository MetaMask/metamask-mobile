export type ConfirmTurnOnBackupAndSyncModalParams = {
  enableBackupAndSync: () => Promise<void>;
  trackEnableBackupAndSyncEvent: () => void;
};
