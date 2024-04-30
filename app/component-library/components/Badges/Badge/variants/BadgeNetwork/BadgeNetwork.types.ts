// External dependencies.
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';
import { AvatarNetworkProps } from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.types';

/**
 * BadgeNetwork component props.
 */
export interface BadgeNetworkProps
  extends Omit<BadgeBaseProps, 'children'>,
    AvatarNetworkProps {}

/**
 * Style sheet BadgeNetwork parameters.
 */
export type BadgeNetworkStyleSheetVars = Pick<
  BadgeNetworkProps,
  'style' | 'size'
> & {
  containerSize: { width: number; height: number } | null;
};
