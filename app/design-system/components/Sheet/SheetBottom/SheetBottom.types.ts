/**
 * SheetBottom component props.
 */
export interface SheetBottomProps {
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
  /**
   * Optional callback that gets triggered when sheet is dismissed.
   */
  onDismissed?: () => void;
  /**
   * Boolean that indicates if sheet is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.
   * @default true
   */
  isInteractable?: boolean;
}

export type SheetBottomPostCallback = () => void;

export interface SheetBottomRef {
  hide: (callback?: SheetBottomPostCallback) => void;
}

/**
 * Style sheet input parameters.
 */
export interface SheetBottomStyleSheetVars {
  maxSheetHeight: number;
}
