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
}

export interface BottomSheetRef {
  show: () => void;
}

/**
 * BottomSheet component style sheet.
 */
export interface BottomSheetStyleSheet {
  base: ViewStyle;
  checkbox: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type BottomSheetStyleSheetVars = Pick<BottomSheetProps, 'style'>;
