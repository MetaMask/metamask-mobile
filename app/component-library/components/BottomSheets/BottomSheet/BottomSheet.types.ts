import { ViewProps } from 'react-native';

/**
 * BottomSheet component props.
 */
export interface BottomSheetProps extends ViewProps {
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
  /**
   * Optional callback that gets triggered when sheet is dismissed.
   */
  onClose?: (hasPendingAction: boolean) => void;
  /**
   * Optional boolean that indicates if sheet is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.
   * @default true
   */
  isInteractable?: boolean;
}

export type BottomSheetPostCallback = () => void;

export interface BottomSheetRef {
  hide: (callback?: BottomSheetPostCallback) => void;
}

/**
 * Style sheet input parameters.
 */
export interface BottomSheetStyleSheetVars {}
