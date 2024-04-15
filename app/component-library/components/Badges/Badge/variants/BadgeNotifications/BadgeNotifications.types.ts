// External dependencies.
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';

/**
 * BadgeNotifications component props.
 */
export interface BadgeNotificationsProps
  extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Optional prop for name of the notifications.
   */
  name?: string;
  /**
   * Optional prop to control the image source of the notifications
   * from either a local or remote source.
   */
  iconName?: IconName;
}

/**
 * Style sheet BadgeNotifications parameters.
 */
export type BadgeNotificationsStyleSheetVars = Pick<
  BadgeNotificationsProps,
  'style'
> & {
  containerSize: { width: number; height: number } | null;
};
