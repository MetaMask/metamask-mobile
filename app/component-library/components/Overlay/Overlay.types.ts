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
  /**
   * Duration of the overlay animation.
   * @default DEFAULT_OVERLAY_ANIMATION_DURATION
   */
  duration?: number;
}

/**
 * Style sheet Overlay parameters.
 */
export type OverlayStyleSheetVars = Pick<OverlayProps, 'style' | 'color'>;
