// Third party dependencies.
import React from 'react';
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
}

/**
 * Style sheet input parameters.
 */
export type CheckboxStyleSheetVars = Pick<CheckboxProps, 'style'> & {
  isChecked: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isDanger: boolean;
};
