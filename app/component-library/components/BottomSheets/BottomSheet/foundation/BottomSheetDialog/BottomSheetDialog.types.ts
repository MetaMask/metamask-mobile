// Third party dependencies.
import { StyleProp, ViewProps, ViewStyle } from 'react-native';

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
   * Optional callback that gets triggered when sheet is closed.
   */
  onClose?: (hasPendingAction?: boolean) => void;
  /**
   * Optional callback that gets triggered when sheet is opened.
   */
  onOpen?: (hasPendingAction?: boolean) => void;
  /**
   * Ref(s) to native views or gesture-handler-wrapped scroll views that should
   * recognize touches simultaneously with the sheet dismiss pan (e.g. FlashList
   * using `ScrollView` from `react-native-gesture-handler` on Android).
   */
  simultaneousHandlers?: React.Ref<unknown> | React.Ref<unknown>[];
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
}
