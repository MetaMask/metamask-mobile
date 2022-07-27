import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * CellContainerSelectOption component props.
 */
export interface CellContainerSelectOptionProps extends TouchableOpacityProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected: boolean;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Content to wrap for selection.
   */
  children: React.ReactNode;
}

/**
 * CellContainerSelectOption component style sheet.
 */
export interface CellContainerSelectOptionStyleSheet {
  base: ViewStyle;
  baseSelected: ViewStyle;
  verticalBar: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type CellContainerSelectOptionStyleSheetVars = Pick<
  CellContainerSelectOptionProps,
  'style' | 'isSelected'
>;
