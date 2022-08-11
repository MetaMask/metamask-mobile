// Third party dependencies.
import { ViewProps } from 'react-native';
/**
 * AvatarBase sizes.
 */
export enum AvatarBaseSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * Current available positions for badge placement
 */
export enum AvatarBadgePositionVariant {
  TopRight = 'top-right',
  BottomRight = 'bottom-right',
}

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps {
  /**
   * Optional enum to select between AvatarBase sizes.
   * @default Md
   */
  size?: AvatarBaseSize;
  /**
   * The content of the badge itself. This can take in any component.
   */
  badgeContent?: React.ReactNode;
  /**
   * Placement position of the badge relative to the avatar.
   */
  badgePosition?: AvatarBadgePositionVariant;
}

/**
 * Style sheet input parameters.
 */
export interface AvatarBaseStyleSheetVars
  extends Pick<AvatarBaseProps, 'style' | 'badgePosition'> {
  size: AvatarBaseSize;
}
