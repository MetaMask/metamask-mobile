// Third party dependencies.
import { ColorValue, ViewProps } from 'react-native';

/**
 * Overlay component props.
 */
export interface OverlayProps extends ViewProps {
  /**
   * Color of the Overlay.
   * @default theme.colors.overlay.default
   */
  overlayColor?: ColorValue;
  /**
   * Function to trigger when the overlay is clicked.
   */
  onPress?: () => void;
}
