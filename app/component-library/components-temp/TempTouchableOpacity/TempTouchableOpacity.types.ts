// Third party dependencies.
import { TouchableOpacityProps, GestureResponderEvent } from 'react-native';

/**
 * TempTouchableOpacity component props.
 */
export interface TempTouchableOpacityProps extends TouchableOpacityProps {
  /**
   * Function to trigger when pressing the button.
   */
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * Function to trigger when pressing in the button.
   */
  onPressIn?: (event: GestureResponderEvent) => void;
  /**
   * Optional prop to enable Android press handling.
   * @default true
   */
  shouldEnableAndroidPressIn?: boolean;
  /**
   * Optional param to disable the button.
   */
  disabled?: boolean;
  /**
   * Child components to render inside the touchable.
   */
  children?: React.ReactNode;
}

// Re-export the interface for external use
export type { TempTouchableOpacityProps };
