// External dependencies
import { AvatarBadgePositions } from '../../../../Avatar.types';
import { AvatarBaseProps } from '../../../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import { BadgeProps } from '../../../../../../Badges/Badge';

/**
 * AvatarBaseBase component props.
 */
export type AvatarBaseBaseProps = AvatarBaseProps & {
  /**
   * Optional boolean to select if badge should be included.
   * @default false
   */
  isBadgeIncluded?: boolean;
  /**
   * Optional enum for the Badge props.
   */
  badgeProps?: BadgeProps;
  /**
   * Optional enum to set the position for the Badge.
   * @default AvatarBadgePositions.TopRight
   */
  badgePosition?: AvatarBadgePositions;
};
