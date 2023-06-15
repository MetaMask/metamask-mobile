// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * BottomSheetContent component props.
 */
export interface BottomSheetContentProps extends ViewProps {
  /**
   * Optional content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to toggle full screen state of BottomSheetContent.
   * @default false
   */
  isFullscreen?: boolean;
  /**
   * Optional boolean that indicates if sheet is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.
   * @default true
   */
  isInteractable?: boolean;
  /**
   * Optional callback that gets triggered when sheet is dismissed.
   */
  onDismissed?: () => void;
}

export type BottomSheetContentPostCallback = () => void;

export interface BottomSheetContentRef {
  hide: (callback?: BottomSheetContentPostCallback) => void;
}

/**
 * Style sheet input parameters.
 */
export interface BottomSheetContentStyleSheetVars {
  maxSheetHeight: number;
  screenBottomPadding: number;
  isFullscreen: boolean;
}
