// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';
import { AvatarSize } from '../../Avatars/Avatar';

// External dependencies.
import { IconProps } from '../../Icons/Icon';

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
   * Function to call when pressed.
   */
  onPress: () => void;
  /**
   * Size to apply to icon.
   */
  iconSize: AvatarSize;
  /**
   * Color to apply to icon.
   */
  iconColor: string;
  /**
   * Color to apply to icon background color.
   */
  iconBackgroundColor: string;
}

/**
 * Style sheet input parameters.
 */
export type TabBarItemStyleSheetVars = Pick<TabBarItemProps, 'style'>;
