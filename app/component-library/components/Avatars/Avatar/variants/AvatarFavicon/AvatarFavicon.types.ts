// Third party dependencies.
import { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarFavicon component props.
 */
export interface AvatarFaviconProps extends AvatarBaseProps {
  /**
   * A favicon image from either a local or remote source.
   */
  imageSource?: ImageSourcePropType;
  /**
   * Optional boolean to includes border or not.
   * @default false
   */
  includesBorder?: boolean;
  /**
   * The name of the avatar.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * The name of the avatar.
   */
  name?: string;
}

/**
 * Style sheet input parameters.
 */
export type AvatarFaviconStyleSheetVars = Pick<AvatarFaviconProps, 'style'>;
