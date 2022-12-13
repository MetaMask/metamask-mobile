// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Checkbox component props.
 */
export interface CheckboxProps extends ViewProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected: boolean;
}

/**
 * Style sheet input parameters.
 */
export type CheckboxStyleSheetVars = Pick<
  CheckboxProps,
  'style' | 'isSelected'
>;
