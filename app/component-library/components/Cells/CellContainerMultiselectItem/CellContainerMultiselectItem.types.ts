// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * CellContainerMultiselectItem component props.
 */
export interface CellContainerMultiselectItemProps
  extends TouchableOpacityProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected: boolean;
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type CellContainerMultiselectItemStyleSheetVars = Pick<
  CellContainerMultiselectItemProps,
  'style' | 'isSelected'
>;
