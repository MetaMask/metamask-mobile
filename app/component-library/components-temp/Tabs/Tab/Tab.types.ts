// Third party dependencies.
import { PressableProps, LayoutChangeEvent } from 'react-native';

// Internal dependencies.
import { IconName } from 'app/component-library/components/Icons/Icon/Icon.types';

/**
 * Tab component props
 */
export interface TabProps extends PressableProps {
  /**
   * The label text for the tab
   */
  label: string;
  /**
   * Optional icon rendered above the label.
   */
  iconName?: IconName;
  /**
   * Whether the tab is currently active
   */
  isActive: boolean;
  /**
   * Whether the tab is disabled (locked)
   */
  isDisabled?: boolean;
  /**
   * Callback when tab is pressed
   */
  onPress: () => void;
  /**
   * Callback when tab layout changes
   */
  onLayout?: (event: LayoutChangeEvent) => void;
}
