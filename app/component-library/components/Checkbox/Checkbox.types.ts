// Third party dependencies.
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { TouchableOpacityProps } from '../../../components/Base/TouchableOpacity';

/**
 * Checkbox component props.
 */
export interface CheckboxProps extends TouchableOpacityProps {
  /**
   * Optional function to trigger when pressing the checkbox.
   */
  onPress?: () => void;
  /**
   * Optional label for the Checkbox.
   */
  label?: string | React.ReactNode;
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
  isReadOnly?: boolean;
  /**
   * Optional prop to configure the danger state.
   */
  isDanger?: boolean;
  /**
   * Optional prop to control the style of the Checkbox.
   */
  checkboxStyle?: StyleProp<ViewStyle> | undefined;
}

/**
 * Style sheet input parameters.
 */
export type CheckboxStyleSheetVars = Pick<
  CheckboxProps,
  'style' | 'checkboxStyle'
> & {
  isChecked: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isDanger: boolean;
};
