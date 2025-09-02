// Third party dependencies.
import { StyleProp, ViewProps, ViewStyle } from 'react-native';

// Enums
export enum BottomSheetDialogContainerVariant {
  Default = 'default',
  Trade = 'trade',
}

/**
 * BottomSheetDialog component props.
 */
export interface BottomSheetDialogProps extends ViewProps {
  /**
   * Optional content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to toggle full screen state of BottomSheetDialog.
   * @default false
   */
  isFullscreen?: boolean;
  /**
   * Optional boolean that indicates if sheet is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.
   * @default true
   */
  isInteractable?: boolean;
  /**
   * Optional boolean that indicates if the KeyboardAvoidingView is enabled.
   * @default true
   */
  keyboardAvoidingViewEnabled?: boolean;
  /**
   * Optional prop to set the container variant (controls shape and border radius).
   * Default: rounded top corners with 24px radius.
   * Trade: dented top center shape to accommodate a 45px floating button.
   * @default BottomSheetDialogContainerVariant.Default
   */
  containerVariant?: BottomSheetDialogContainerVariant;
  /**
   * Optional callback that gets triggered when sheet is closed.
   */
  onClose?: (hasPendingAction?: boolean) => void;
  /**
   * Optional callback that gets triggered when sheet is opened.
   */
  onOpen?: (hasPendingAction?: boolean) => void;
}

export interface BottomSheetDialogRef {
  onCloseDialog: (callback?: () => void) => void;
  onOpenDialog: (callback?: () => void) => void;
}

/**
 * Style sheet input parameters.
 */
export interface BottomSheetDialogStyleSheetVars {
  maxSheetHeight: number;
  screenBottomPadding: number;
  style: StyleProp<ViewStyle>;
  isFullscreen: boolean;
  containerVariant: BottomSheetDialogContainerVariant;
  screenWidth: number;
}
