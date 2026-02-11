/**
 * Specifies what action the UI should present to the user to recover from an error.
 */
export enum RecoveryAction {
  /** User acknowledges the error and continues (shows "Continue" button) */
  ACKNOWLEDGE = 'acknowledge',
  /** Retry the failed operation */
  RETRY = 'retry',
}
