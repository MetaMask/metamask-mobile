import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * CellContainerSelectItem component props.
 */
export interface CellContainerSelectItemProps extends TouchableOpacityProps {
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
 * Style sheet input parameters.
 */
export type CellContainerSelectItemStyleSheetVars = Pick<
  CellContainerSelectItemProps,
  'style' | 'isSelected'
>;
