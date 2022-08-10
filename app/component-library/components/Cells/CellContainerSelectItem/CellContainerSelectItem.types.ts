// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * CellContainerSelectItem component props.
 */
export interface CellContainerSelectItemProps extends TouchableOpacityProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected: boolean;
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
