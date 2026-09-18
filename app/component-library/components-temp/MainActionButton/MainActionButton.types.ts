// Third party dependencies.
import { PressableProps, StyleProp, ViewStyle } from 'react-native';
import type { GlassColorScheme } from 'expo-glass-effect';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

/**
 * MainActionButton component props.
 */
export interface MainActionButtonProps extends PressableProps {
  /**
   * Optional style applied to the outermost Animated.View container.
   * Use this to control layout (e.g. flex: 1) without adding a wrapper node.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName: IconName;
  /**
   * Label text that will be displayed below the icon.
   */
  label: string;
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
  /**
   * Draws the surface as iOS 26 Liquid Glass. Callers resolve availability
   * (see `useLiquidGlass`) so unsupported platforms keep the opaque surface.
   */
  isGlass?: boolean;
  /**
   * Theme the glass follows when `isGlass` is set; defaults to the system's.
   */
  glassColorScheme?: GlassColorScheme;
}

/**
 * Style sheet input parameters.
 */
export type MainActionButtonStyleSheetVars = Pick<
  MainActionButtonProps,
  'style'
> & {
  isDisabled: boolean;
  isGlass: boolean;
};
