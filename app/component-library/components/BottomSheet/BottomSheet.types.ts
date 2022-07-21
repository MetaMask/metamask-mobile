import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * BottomSheet component props.
 */
export interface BottomSheetProps extends TouchableOpacityProps {
  // /**
  //  * Determines if checkbox is selected.
  //  */
  // isSelected: boolean;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
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
  show: () => void;
  hide: () => void;
}

/**
 * Style sheet input parameters.
 */
export interface BottomSheetStyleSheetVars
  extends Pick<BottomSheetProps, 'style'> {
  maxSheetHeight: number;
}
