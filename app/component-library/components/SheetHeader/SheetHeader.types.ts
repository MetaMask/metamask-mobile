import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * SheetHeader component props.
 */
export interface SheetHeaderProps extends TouchableOpacityProps {
  /**
   * Callback to trigger when pressed.
   */
  // onPress: () => void;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  // style?: StyleProp<ViewStyle>;
  /**
   * Content to wrap for multiselect.
   */
  // children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type SheetHeaderStyleSheetVars = Pick<SheetHeaderProps, 'style'>;
