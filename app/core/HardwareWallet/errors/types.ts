/**
 * Specifies what action the UI should present to the user to recover from an error.
 */
export enum RecoveryAction {
  /** User acknowledges the error, closes the error bottom sheet */
  ACKNOWLEDGE = 'acknowledge',
  /** Retry the failed operation */
  RETRY = 'retry',
}
