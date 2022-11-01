// External dependencies.
import { BadgeWrapperProps as MorphBadgeWrapperProps } from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgeProps } from '../Badge/Badge.types';

/**
 * Badge component props.
 */
export interface BadgeWrapperProps
  extends Omit<MorphBadgeWrapperProps, 'badgeProps'> {
  /**
   * Props for the Badge component.
   */
  badgeProps: BadgeProps;
}

/**
 * Style sheet input parameters.
 */
export type { BadgeWrapperStyleSheetVars } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
