export interface PerpsCrossMarginConfirmBottomSheetProps {
  /**
   * Called when the user confirms after acknowledging every item.
   */
  onConfirm: () => void;
  /**
   * Called when the user dismisses the sheet via "Go back", the close button,
   * or a swipe-down gesture.
   */
  onClose: () => void;
}
