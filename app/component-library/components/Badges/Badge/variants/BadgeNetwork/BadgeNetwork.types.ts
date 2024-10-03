// External dependencies.
import { BadgeBaseProps } from '@component-library/components/Badges/Badge/foundation/BadgeBase/BadgeBase.types';
import { AvatarNetworkProps } from '@component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.types';

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
