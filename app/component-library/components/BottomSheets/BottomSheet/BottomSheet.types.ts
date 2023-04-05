/**
 * BottomSheet component props.
 */
export interface BottomSheetProps {
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
  /**
   * Optional callback that gets triggered when sheet is dismissed.
   */
  onDismissed?: () => void;
  /**
   * Optional boolean that indicates if sheet is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.
   * @default true
   */
  isInteractable?: boolean;
  /**
   * Optional number for the minimum spacing reserved for the overlay tappable area.
   * @default 250
   */
  reservedMinOverlayHeight?: number;
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
  screenBottomPadding: number;
}
