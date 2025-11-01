// External dependencies.
import { ButtonAnimatedProps } from '@metamask/design-system-react-native';
import { IconName } from '../../Icons/Icon';

/**
 * TabBarItem component props.
 */
export interface TabBarItemProps extends ButtonAnimatedProps {
  /**
   * Label of the tab item.
   */
  label: string;
  /**
   * Icon name from design system.
   */
  iconName: IconName;
  /**
   * Function to call when pressed.
   */
  onPress: () => void;
  /**
   * Whether the tab item is active.
   */
  isActive?: boolean;
  /**
   * Whether this is a trade button (renders with special styling).
   */
  isTradeButton?: boolean;
}
