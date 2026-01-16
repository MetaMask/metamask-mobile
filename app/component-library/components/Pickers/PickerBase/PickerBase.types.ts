// Third party dependencies.
import { ViewStyle } from 'react-native';
import { TouchableOpacityProps } from '../../../../components/Base/TouchableOpacity';
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
}

/**
 * Style sheet input parameters.
 */
export type PickerBaseStyleSheetVars = Pick<
  PickerBaseProps,
  'style' | 'dropdownIconStyle'
>;
