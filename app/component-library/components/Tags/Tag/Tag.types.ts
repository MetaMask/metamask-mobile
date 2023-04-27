// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Tag component props.
 */
export interface TagProps extends ViewProps {
  /**
   * Label of the tag.
   */
  label: string;
}

/**
 * Style sheet input parameters.
 */
export type TagStyleSheetVars = Pick<TagProps, 'style'>;
