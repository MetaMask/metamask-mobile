export interface CancelLimitOrderModalParams {
  /**
   * Fired once the user confirms the cancellation, before the sheet closes.
   * Handed in by the screen that opened this sheet, which is the only place
   * holding the order being cancelled.
   */
  onConfirm: () => void;
}

export interface CancelLimitOrderModalProps
  extends CancelLimitOrderModalParams {
  /**
   * Fired when the sheet is dismissed. Used by tests and non-navigation hosts.
   */
  onClose?: () => void;
  /**
   * Pops the Bridge modal route when the sheet closes.
   */
  goBack?: () => void;
  /**
   * Optional test ID for the sheet container.
   */
  testID?: string;
}
