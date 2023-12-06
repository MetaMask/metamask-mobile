// Third party dependencies.
import React from 'react';
import { TouchableOpacityProps } from 'react-native';

/**
 * RadioButton component props.
 */
export interface RadioButtonProps extends TouchableOpacityProps {
  /**
   * Optional function to trigger when pressing the RadioButton.
   */
  onPress?: () => void;
  /**
   * Optional label for the RadioButton.
   */
  label?: string | React.ReactNode;
  /**
   * Optional prop to configure the checked state.
   */
  isChecked?: boolean;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type RadioButtonStyleSheetVars = Pick<RadioButtonProps, 'style'> & {
  isChecked: boolean;
  isDisabled: boolean;
};
