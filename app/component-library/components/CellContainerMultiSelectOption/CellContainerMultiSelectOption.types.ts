import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * CellContainerMultiSelectOption component props.
 */
export interface CellContainerMultiSelectOptionProps extends TouchableOpacityProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected: boolean;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
}

/**
 * CellContainerMultiSelectOption component style sheet.
 */
export interface CellContainerMultiSelectOptionStyleSheet {
  base: ViewStyle;
  baseSelected: ViewStyle;
  checkbox: ViewStyle;
  childrenContainer: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type CellContainerMultiSelectOptionStyleSheetVars = Pick<
  CellContainerMultiSelectOptionProps,
  'style' | 'isSelected'
>;
