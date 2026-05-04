// Third party dependencies.
import { PressableProps, LayoutChangeEvent } from 'react-native';

// Internal dependencies.
import { IconName } from '../../../components/Icons/Icon/Icon.types';

/**
 * TabsIconTab component props.
 * Unlike the base Tab component, an icon is always required.
 */
export interface TabsIconTabProps extends PressableProps {
  /**
   * The label text rendered below the icon
   */
  label: string;
  /**
   * Icon rendered above the label — required for this variant
   */
  iconName: IconName;
  /**
   * Whether the tab is currently active
   */
  isActive: boolean;
  /**
   * Whether the tab is disabled
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
   * When true the tab stretches to fill equal width inside a fill-width bar
   */
  fillWidth?: boolean;
}
