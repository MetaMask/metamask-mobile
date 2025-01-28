// Third party dependencies.
import { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

export enum AvatarFaviconSize {
  Xs = 'xs',
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
  Xl = 'xl',
}

/**
 * AvatarFavicon component props.
 */
export type AvatarFaviconProps = {
  /**
   * A favicon image from either a local or remote source.
   */
  imageSource?: ImageSourcePropType;
  /**
   * The size of the avatar.
   */
  size?: AvatarFaviconSize;
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
};

/**
 * Style sheet input parameters.
 */
export type AvatarFaviconStyleSheetVars = Pick<AvatarFaviconProps, 'style'>;
