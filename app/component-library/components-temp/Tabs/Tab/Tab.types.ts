// Third party dependencies.
import { PressableProps } from 'react-native';

/**
 * Tab component props
 */
export interface TabProps extends PressableProps {
  /**
   * The label text for the tab
   */
  label: string;
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
}
