// External dependencies
import { AvatarBaseBaseProps } from '../../foundation/AvatarBaseBase';
import { BadgeProps } from '../../../../../../Badges/Badge';

/**
 * AvatarBaseWithBadgeProps component props.
 */
export interface AvatarBaseWithBadgeProps extends AvatarBaseBaseProps {
  /**
   * Boolean to select if badge should be included.
   */
  includeBadge: true;
  /**
   * Props for Badge
   */
  badgeProps: BadgeProps;
}

/**
 * Style sheet input parameters.
 */
export type AvatarBaseWithBadgeStyleSheetVars = Pick<
  AvatarBaseWithBadgeProps,
  'style' | 'size' | 'badgePosition'
>;
