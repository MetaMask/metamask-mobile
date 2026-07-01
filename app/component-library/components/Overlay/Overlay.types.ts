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

/**
 * Ref handle for imperative control of overlay fade animations.
 */
export interface OverlayRef {
  /** Fade the overlay in. */
  fadeIn: () => void;
  /** Fade the overlay out with an optional callback after animation completes. */
  fadeOut: (callback?: () => void) => void;
}
