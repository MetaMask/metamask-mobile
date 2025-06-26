// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { TextProps } from '../../Texts/Text/Text.types';

/**
 * Tag component props.
 */
export interface TagProps extends ViewProps {
  /**
   * Label of the tag.
   */
  label: string;
  /**
   * Optional object to pass props to Text component.
   */
  textProps?: Omit<TextProps, 'children'>;
}

/**
 * Style sheet input parameters.
 */
export type TagStyleSheetVars = Pick<TagProps, 'style'>;
