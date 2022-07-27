import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * PickerItem component props.
 */
export interface PickerItemProps extends TouchableOpacityProps {
  /**
   * Callback to trigger when pressed.
   */
  onPress: () => void;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type PickerItemStyleSheetVars = Pick<PickerItemProps, 'style'>;
