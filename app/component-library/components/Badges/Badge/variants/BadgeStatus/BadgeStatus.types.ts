// Third party dependencies.
import { ColorValue } from 'react-native';

// External dependencies.
import { BadgeVariant } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

/**
 * Badge variants.
 */
export enum BadgeStatusState {
  Active = 'Active',
  Inactive = 'Inactive',
}

/**
 * BadgeStatus component props.
 */
export interface BadgeStatusProps extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Optional prop to control the variant of badge.
   */
  variant: BadgeVariant.Status;
  /**
   * Optional prop to control the status of BadgeStatus.
   * @default BadgeStatusState.Inactive
   */
  state?: BadgeStatusState;
  /**
   * Optional prop to change the color of the border.
   */
  borderColor?: ColorValue;
}

/**
 * Style sheet BadgeStatus parameters.
 */
export type BadgeStatusStyleSheetVars = Pick<
  BadgeStatusProps,
  'style' | 'borderColor'
> & {
  state: BadgeStatusState;
};
