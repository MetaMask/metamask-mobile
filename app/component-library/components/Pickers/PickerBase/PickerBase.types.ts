// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * PickerBase component props.
 */
export interface PickerBaseProps extends TouchableOpacityProps {
  /**
   * Callback to trigger when pressed.
   */
  onPress: () => void;
  /**
   * Content to wrap in PickerBase.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type PickerBaseStyleSheetVars = Pick<PickerBaseProps, 'style'>;
