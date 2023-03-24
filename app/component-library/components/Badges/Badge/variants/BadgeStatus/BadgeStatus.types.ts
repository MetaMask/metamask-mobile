// Third party dependencies.
import { ColorValue } from 'react-native';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

/**
 * Badge variants.
 */
export enum BadgeStatusState {
  Connected = 'Connected',
  Disconnected = 'Disconnected',
}

/**
 * BadgeStatus component props.
 */
export interface BadgeStatusProps extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Variant of badge.
   */
  variant: BadgeVariants.Status;
  /**
   * Status of BadgeStatus.
   * @default BadgeStatusState.Connected
   */
  state?: BadgeStatusState;
  /**
   * Color of the border.
   */
  borderColor?: ColorValue;
}
