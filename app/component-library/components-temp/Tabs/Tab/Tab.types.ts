// Third party dependencies.
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
   * Whether to render a dot after the label, for tabs holding something the
   * user has not seen or acted on yet
   */
  showsIndicatorDot?: boolean;
  /**
   * Whether the tab stretches to share the row's width with its siblings
   * instead of hugging its label
   *
   * @default false
   */
  isFullWidth?: boolean;
}
