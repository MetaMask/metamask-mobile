// External dependencies.
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';
import { AvatarNetworkProps } from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.types';

/**
 * BadgeNetwork component props.
 */
export interface BadgeNetworkProps
  extends Omit<BadgeBaseProps, 'children'>,
    AvatarNetworkProps {
  /**
   * Optional prop to control whether the Badge should be scaled to the content.
   * @default true
   */
  isScaled?: boolean;
}

/**
 * Style sheet BadgeNetwork parameters.
 */
export type BadgeNetworkStyleSheetVars = Pick<
  BadgeNetworkProps,
  'style' | 'size' | 'isScaled'
> & {
  containerSize: { width: number; height: number } | null;
};
