import { StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';

/**
 * SelectableListItem component props.
 */
export interface SelectableListItemProps extends TouchableOpacityProps {
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
 * SelectableListItem component style sheet.
 */
export interface SelectableListItemStyleSheet {
  base: ViewStyle;
  overlay: ViewStyle;
  verticalBar: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type SelectableListItemStyleSheetVars = Pick<
  SelectableListItemProps,
  'style' | 'isSelected'
>;
