// Third party dependencies.
import { ColorValue, TouchableOpacityProps } from 'react-native';

/**
 * Overlay component props.
 */
export interface OverlayProps extends TouchableOpacityProps {
  /**
   * Color of the Overlay.
   * @default theme.colors.overlay.default
   */
  color?: ColorValue;
}

/**
 * Style sheet Overlay parameters.
 */
export type OverlayStyleSheetVars = Pick<OverlayProps, 'style' | 'color'>;
