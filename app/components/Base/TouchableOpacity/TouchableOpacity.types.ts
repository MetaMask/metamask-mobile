import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PressableProps } from 'react-native-gesture-handler';

// Extract PressableEvent type from PressableProps
type PressableEvent = Parameters<NonNullable<PressableProps['onPressIn']>>[0];

/**
 * Props for TouchableOpacity component
 * Extends PressableProps from react-native-gesture-handler
 */
export interface TouchableOpacityProps extends Omit<PressableProps, 'style'> {
  /**
   * Children to render inside the TouchableOpacity
   */
  children?: ReactNode;

  /**
   * Style for the container.
   * Can be a ViewStyle or a function that receives { pressed } state.
   * Note: When using a function, the pressed state is resolved once -
   * use activeOpacity for press feedback instead.
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Opacity value when pressed (0-1)
   * @default 0.2
   */
  activeOpacity?: number;

  /**
   * Whether the component is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Callback when press is detected
   */
  onPress?: (event: PressableEvent) => void;

  /**
   * Callback when press starts
   */
  onPressIn?: (event: PressableEvent) => void;

  /**
   * Callback when press ends
   */
  onPressOut?: (event: PressableEvent) => void;

  /**
   * Callback for long press
   */
  onLongPress?: (event: PressableEvent) => void;

  /**
   * Delay before onLongPress is called (in milliseconds)
   * @default 500
   */
  delayLongPress?: number;

  /**
   * Additional distance outside of the view in which a press is detected
   */
  hitSlop?:
    | number
    | { top?: number; bottom?: number; left?: number; right?: number };

  /**
   * Additional distance outside of the view in which a touch is considered a press
   */
  pressRetentionOffset?:
    | number
    | { top?: number; bottom?: number; left?: number; right?: number };
}
