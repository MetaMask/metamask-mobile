// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../Icon';

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
}

/**
 * Style sheet input parameters.
 */
export type TabBarItemStyleSheetVars = Pick<
  TabBarItemProps,
  'style' | 'isSelected'
>;
