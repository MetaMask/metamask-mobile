import { ViewProps } from 'react-native';

/**
 * SheetBottom component props.
 */
export interface SheetBottomProps extends ViewProps {
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
  /**
   * Optional callback that gets triggered when sheet is dismissed.
   */
  onDismissed?: (hasPendingAction: boolean) => void;
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

export type SheetBottomPostCallback = () => void;

export interface SheetBottomRef {
  hide: (callback?: SheetBottomPostCallback) => void;
}

/**
 * Style sheet input parameters.
 */
export interface SheetBottomStyleSheetVars {
  maxSheetHeight: number;
  screenBottomPadding: number;
}
