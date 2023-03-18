// Third party dependencies.
import { TouchableOpacityProps, ViewStyle } from 'react-native';

// External dependencies.
import { IconProps, IconSize } from '../../Icons/Icon';

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
   * Optional icon size property
   */
  iconSize?: IconSize;
  /**
   * Optional icon size property
   */
  iconColor?: string;
  /**
   * Optional styles for the Touchable Opacity
   */
  iconContainerStyle?: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type TabBarItemStyleSheetVars = Pick<
  TabBarItemProps,
  'style' | 'isSelected'
>;
