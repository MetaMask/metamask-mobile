// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * SelectItem component props.
 */
export interface SelectItemProps extends TouchableOpacityProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected?: boolean;
  /**
   * Content to wrap for selection.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type SelectItemStyleSheetVars = Pick<
  SelectItemProps,
  'style' | 'isSelected'
>;
