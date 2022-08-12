// Third party dependencies.
import { ViewProps } from 'react-native';
import { BadgeWrapperProps } from '../../BadgeWrapper';

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

export interface AvatarBadgeProps
  extends Omit<BadgeWrapperProps, 'badgeContentStyle' | 'children'> {
  /**
   * Placement position of the badge relative to the avatar.
   * @default TopRight
   */
  position?: AvatarBadgePositionVariant;
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
   * Optional prop to include Badges.
   * The content of the badge itself. This can take in any component.
   */
  badge?: AvatarBadgeProps;
}

/**
 * Style sheet input parameters.
 */
export interface AvatarBaseStyleSheetVars
  extends Pick<AvatarBaseProps, 'style' | 'badge'> {
  size: AvatarBaseSize;
}
