/**
 * Account backup navigation parameters
 */

/** Account backup parameters */
export interface AccountBackupParams {
  words?: string[];
}

/** Manual backup step 3 parameters */
export interface ManualBackupStep3Params {
  words: string[];
  steps: string[];
  backupFlow: boolean;
}
