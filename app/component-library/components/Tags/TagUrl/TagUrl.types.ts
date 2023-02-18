// Third party dependencies.
import { ImageSourcePropType, ViewProps } from 'react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';

interface TagUrlCta {
  label: string;
  onPress: () => void;
}

/**
 * TagUrl component props.
 */
export interface TagUrlProps extends ViewProps {
  /**
   * Favicon image from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
  /**
   * Label of the tag.
   */
  label: string;
  /**
   * Object that contains the label and callback of the call to action.
   */
  cta?: TagUrlCta;
  /**
   * Optional icon to render to the left of the label.
   */
  iconName?: IconName;
}

/**
 * Style sheet input parameters.
 */
export type TagUrlStyleSheetVars = Pick<TagUrlProps, 'style'>;
