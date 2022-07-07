import { StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';

/**
 * Tag component props.
 */
export interface TagProps extends ViewProps {
  /**
   * Label of the tag.
   */
  label: string;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Tag component style sheet.
 */
export interface TagStyleSheet {
  base: ViewStyle;
  label: TextStyle;
}

/**
 * Style sheet input parameters.
 */
export type TagStyleSheetVars = Pick<TagProps, 'style'>;
