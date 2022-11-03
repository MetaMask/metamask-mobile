// External dependencies
import { AvatarBaseBaseProps } from '../../foundation/AvatarBaseBase';
import { BadgeProps } from '../../../../../../Badges/Badge';

/**
 * AvatarBaseWithBadgeProps component props.
 */
export type AvatarBaseWithBadgeProps = AvatarBaseBaseProps & {
  /**
   * Boolean to select if badge should be included.
   */
  isBadgeIncluded: true;
  /**
   * Enum for the Badge props.
   */
  badgeProps: BadgeProps;
};

/**
 * Style sheet input parameters.
 */
export type AvatarBaseWithBadgeStyleSheetVars = Pick<
  AvatarBaseWithBadgeProps,
  'style' | 'size' | 'badgePosition'
>;
