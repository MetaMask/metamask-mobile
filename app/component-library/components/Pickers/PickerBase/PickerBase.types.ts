// Third party dependencies.
import { TouchableOpacityProps, ViewStyle } from 'react-native';
import { IconSize } from '../../Icons/Icon';

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
  /**
   * Icon size.
   */
  iconSize?: IconSize;
  /**
   * Dropdown icon styles.
   */
  dropdownIconStyle?: ViewStyle;
  /**
   * When false, the trailing dropdown arrow icon is not rendered.
   * @default true
   */
  showDropdownIcon?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type PickerBaseStyleSheetVars = Pick<
  PickerBaseProps,
  'style' | 'dropdownIconStyle'
>;
