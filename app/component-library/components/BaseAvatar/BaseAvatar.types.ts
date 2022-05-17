import { ViewProps } from 'react-native';

/**
 * BaseAvatar Avatar sizes
 */
export enum BaseAvatarSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * BaseAvatar component props.
 */
export interface BaseAvatarProps extends ViewProps {
  /**
   * Enum to select between Avatar sizes.
   */
  size: BaseAvatarSize;
}

/**
 * Style sheet input parameters.
 */
export type BaseAvatarStyleSheetVars = Pick<BaseAvatarProps, 'size' | 'style'>;
