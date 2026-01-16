// Third party dependencies.
import React from 'react';
import { TouchableOpacityProps } from '../../../components/Base/TouchableOpacity';

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
export type RadioButtonStyleSheetVars = Pick<RadioButtonProps, 'style'> & {
  isChecked: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isDanger: boolean;
};
