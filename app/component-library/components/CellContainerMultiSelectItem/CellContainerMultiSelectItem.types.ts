import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * CellContainerMultiSelectItem component props.
 */
export interface CellContainerMultiSelectItemProps
  extends TouchableOpacityProps {
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
 * Style sheet input parameters.
 */
export type CellContainerMultiSelectItemStyleSheetVars = Pick<
  CellContainerMultiSelectItemProps,
  'style' | 'isSelected'
>;
