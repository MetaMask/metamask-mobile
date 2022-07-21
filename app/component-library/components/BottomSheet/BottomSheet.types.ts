/**
 * BottomSheet component props.
 */
export interface BottomSheetProps {
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
  /**
   * Callback that gets triggered when sheet is dismissed.
   */
  onDismiss?: () => void;
}

export interface BottomSheetRef {
  hide: () => void;
}

/**
 * Style sheet input parameters.
 */
export interface BottomSheetStyleSheetVars {
  maxSheetHeight: number;
}
