// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';

/**
 * TabBarItem component props.
 */
export interface TabBarItemProps extends TouchableOpacityProps {
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
  /**
   * Optional label text to display below the icon (non-trade buttons only).
   */
  labelText?: string;
  /**
   * Flex style for layout control.
   */
  flexStyle?: 'flex' | 'none';
}

/**
 * Style sheet input parameters.
 */
export type TabBarItemStyleSheetVars = Pick<TabBarItemProps, 'style'>;
