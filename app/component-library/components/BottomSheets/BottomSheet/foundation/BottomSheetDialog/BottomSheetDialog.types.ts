// Third party dependencies.
import { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { PanGestureHandlerProps } from 'react-native-gesture-handler';

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
   * @deprecated react-native-gesture-handler v2 dropped the
   * `PanGestureHandler` component in favour of `Gesture.Pan()` /
   * `GestureDetector`, which configures behaviour through builder methods
   * rather than props. This prop is retained for source-compatibility but is
   * a no-op. To customise gesture behaviour, modify the `Gesture.Pan()`
   * builder inside `BottomSheetDialog.tsx`.
   */
  panGestureHandlerProps?: Omit<
    PanGestureHandlerProps,
    'onGestureEvent' | 'enabled'
  >;
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
