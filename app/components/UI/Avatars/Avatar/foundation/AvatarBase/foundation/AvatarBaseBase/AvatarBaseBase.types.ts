// External dependencies
import { AvatarBadgePositions } from '../../../../Avatar.types';
import { AvatarBaseProps } from '../../../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import { BadgeProps } from '../../../../../../../../component-library/components/Badges/Badge';

/**
 * AvatarBaseBase component props.
 */
export type AvatarBaseBaseProps = AvatarBaseProps & {
  /**
   * Optional boolean to select if badge should be included.
   * @default Md
   */
  isBadgeIncluded?: boolean;
  /**
   * Props for Badge
   */
  badgeProps?: BadgeProps;
  /**
   * Position for Badge
   */
  badgePosition?: AvatarBadgePositions;
};
