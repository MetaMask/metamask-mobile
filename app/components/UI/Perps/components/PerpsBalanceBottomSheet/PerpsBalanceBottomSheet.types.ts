export interface PerpsBalanceBottomSheetProps {
  /** Whether the bottom sheet is visible. */
  isVisible: boolean;
  /** Callback invoked when the sheet is dismissed (swipe, backdrop tap, or close button). */
  onClose: () => void;
  /** Optional testID override for the root BottomSheet. */
  testID?: string;
}
