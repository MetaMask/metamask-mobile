// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * Checkbox component props.
 */
export interface CheckboxProps extends TouchableOpacityProps {
  /**
   * Optional function to trigger when pressing the checkbox.
   */
  onPress?: () => void;
  /**
   * Optional prop to configure the checked state.
   */
  isChecked?: boolean;
  /**
   * Optional prop to configure the indeterminate state.
   */
  isIndeterminate?: boolean;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
  /**
   * Optional prop to configure the readonly state.
   */
  isReadonly?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type CheckboxStyleSheetVars = Pick<CheckboxProps, 'style'> & {
  isChecked: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;
  isReadonly: boolean;
};
