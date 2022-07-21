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

export type BottomSheetPostCallback = () => void;

export interface BottomSheetRef {
  hide: (callback?: BottomSheetPostCallback) => void;
}

/**
 * Style sheet input parameters.
 */
export interface BottomSheetStyleSheetVars {
  maxSheetHeight: number;
}
