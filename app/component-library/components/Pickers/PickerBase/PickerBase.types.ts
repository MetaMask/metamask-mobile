// Third party dependencies.
import { ViewStyle } from 'react-native';
import { IconSize } from '../../Icons/Icon';
import { PressableProps } from '../../../components-temp/Pressable';

/**
 * PickerBase component props.
 */
export interface PickerBaseProps extends PressableProps {
  /**
   * Callback to trigger when pressed.
   */
  onPress: () => void;
  /**
   * Content to wrap in PickerBase.
   */
  children: React.ReactNode;
  /**
   * Icon size.
   */
  iconSize?: IconSize;
  /**
   * Dropdown icon styles.
   */
  dropdownIconStyle?: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type PickerBaseStyleSheetVars = Pick<
  PickerBaseProps,
  'style' | 'dropdownIconStyle'
>;
