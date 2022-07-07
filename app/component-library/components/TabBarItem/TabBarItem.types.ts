import {
  StyleProp,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { IconProps } from '../Icon';

/**
 * TabBarItem component props.
 */
export interface TabBarItemProps extends TouchableOpacityProps {
  /**
   * Label of the tab item.
   */
  label: string;
  /**
   * Icon of the tab item.
   */
  icon: IconProps['name'];
  /**
   * Boolean that states if the item is selected.
   */
  isSelected: boolean;
  /**
   * Function to call when pressed.
   */
  onPress: () => void;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * TabBarItem component style sheet.
 */
export interface TabBarItemStyleSheet {
  base: ViewStyle;
  label: TextStyle;
}

/**
 * Style sheet input parameters.
 */
export type TabBarItemStyleSheetVars = Pick<
  TabBarItemProps,
  'style' | 'isSelected'
>;
