// Third party dependencies.
import { ReactNode } from 'react';
import { PressableProps, LayoutChangeEvent } from 'react-native';

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
  /**
   * Callback when tab layout changes
   */
  onLayout?: (event: LayoutChangeEvent) => void;
  /**
   * Optional content rendered after the label (indicator, tag, icon, etc.)
   */
  endAccessory?: ReactNode;
}
