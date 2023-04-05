// Third party dependencies.
import { ColorValue, ViewProps } from 'react-native';

/**
 * BottomSheetNotch component props.
 */
export interface BottomSheetNotchProps extends ViewProps {
  /**
   * Color of the BottomSheetNotch.
   * @default theme.colors.border.muted
   */
  bottomSheetNotchColor?: ColorValue;
}
