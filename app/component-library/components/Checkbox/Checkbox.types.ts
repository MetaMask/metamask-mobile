import { StyleProp, ViewProps, ViewStyle } from 'react-native';

/**
 * Checkbox component props.
 */
export interface CheckboxProps extends ViewProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected: boolean;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Checkbox component style sheet.
 */
export interface CheckboxStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type CheckboxStyleSheetVars = Pick<
  CheckboxProps,
  'style' | 'isSelected'
>;
