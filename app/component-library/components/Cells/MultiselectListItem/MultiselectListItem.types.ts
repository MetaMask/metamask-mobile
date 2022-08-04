import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * MultiselectListItem component props.
 */
export interface MultiselectListItemProps extends TouchableOpacityProps {
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
 * MultiselectListItem component style sheet.
 */
export interface MultiselectListItemStyleSheet {
  base: ViewStyle;
  checkbox: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type MultiselectListItemStyleSheetVars = Pick<
  MultiselectListItemProps,
  'style' | 'isSelected'
>;
