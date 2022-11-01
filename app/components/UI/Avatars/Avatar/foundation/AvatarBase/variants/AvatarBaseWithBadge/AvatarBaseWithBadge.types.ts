// External dependencies
import { AvatarBaseBaseProps } from '../../foundation/AvatarBaseBase';
import { BadgeProps } from '../../../../../../../../component-library/components/Badges/Badge';

/**
 * AvatarBaseWithBadgeProps component props.
 */
export type AvatarBaseWithBadgeProps = AvatarBaseBaseProps & {
  /**
   * Boolean to select if badge should be included.
   */
  isBadgeIncluded: true;
  /**
   * Props for Badge
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
