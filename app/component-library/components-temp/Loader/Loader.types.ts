// Third party dependencies.
import { ActivityIndicatorProps, ColorValue } from 'react-native';

/**
 * Loader props.
 */
export interface LoaderProps {
  /**
   * Activity indicator size.
   */
  size?: ActivityIndicatorProps['size'];
  /**
   * Activity indicator color.
   */
  color?: ColorValue;
}
