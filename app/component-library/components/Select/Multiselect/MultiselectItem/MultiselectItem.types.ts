// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

/**
 * MultiselectItem component props.
 */
export interface MultiselectItemProps extends TouchableOpacityProps {
  /**
   * Determines if checkbox is selected.
   */
  isSelected?: boolean;
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type MultiselectItemStyleSheetVars = Pick<
  MultiselectItemProps,
  'style' | 'isSelected'
>;
