// External dependencies.
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';

/**
 * BadgeNotifications component props.
 */
export interface BadgeNotificationsProps
  extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Required prop to provide the icon to be used by the notification badge.
   */
  iconName: IconName;
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
