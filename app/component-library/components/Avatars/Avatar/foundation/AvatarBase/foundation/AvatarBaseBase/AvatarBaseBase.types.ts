// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import {
  AvatarBadgePositions,
  AvatarVariants,
  AvatarSizes,
} from '../../../../Avatar.types';
import { BadgeProps } from '../../../../../../Badges/Badge';

/**
 * AvatarBaseBase component props.
 */
export interface AvatarBaseBaseProps extends ViewProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants;
  /**
   * Optional enum to select between Avatar sizes.
   * @default Md
   */
  size?: AvatarSizes;
  /**
   * Optional boolean to select if badge should be included.
   * @default Md
   */
  includeBadge?: boolean;
  /**
   * Props for Badge
   */
  badgeProps?: BadgeProps;
  /**
   * Position for Badge
   */
  badgePosition?: AvatarBadgePositions;
}

/**
 * Style sheet input parameters.
 */
export type AvatarBaseBaseStyleSheetVars = Pick<
  AvatarBaseBaseProps,
  'style' | 'size'
>;
