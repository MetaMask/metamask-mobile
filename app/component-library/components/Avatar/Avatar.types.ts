import { ViewProps } from 'react-native';

/**
 * Avatar Avatar sizes
 */
export enum AvatarSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * Avatar component props.
 */
export interface AvatarProps extends ViewProps {
  /**
   * Enum to select between Avatar sizes.
   */
  size?: AvatarSize;
}

/**
 * Style sheet input parameters.
 */
export type AvatarStyleSheetVars = Pick<AvatarProps, 'size' | 'style'>;
