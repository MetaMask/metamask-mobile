import { StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';

interface TagUrlCta {
  label: string;
  onPress: () => void;
}

/**
 * TagUrl component props.
 */
export interface TagUrlProps extends ViewProps {
  /**
   * Url of the favicon.
   */
  url: string;
  /**
   * Label of the tag.
   */
  label: string;
  /**
   * Object that contains the label and callback of the call to action.
   */
  cta?: TagUrlCta;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * TagUrl component style sheet.
 */
export interface TagUrlStyleSheet {
  base: ViewStyle;
  label: TextStyle;
  cta: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type TagUrlStyleSheetVars = Pick<TagUrlProps, 'style'>;
