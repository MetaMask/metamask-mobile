import { IconName } from '@metamask/design-system-react-native';
import { ImageSourcePropType } from 'react-native';

export interface NotificationMenuItem {
  /**
   * Notification Title (top section of menu item)
   */
  title: string;

  /**
   * Notification Description, the middle content of a notification item.
   * It contains 2 parts:
   * - `start` - content you see on the left hand side
   * - `end` - content you see on the right hand side. If empty, the `start` will fill width
   */
  description: {
    start: string;
    end?: string;
  };

  /**
   * The large image/icon you see on a notification menu item
   */
  image?: {
    url?: string | ImageSourcePropType;
    variant?: 'circle' | 'square';
  };

  /**
   * This is the small badge icon on the notification icon
   */
  badgeIcon?: IconName;

  /**
   * Timestamp of the notification.
   * This is meant to be a stringified date
   */
  createdAt: string;

  /**
   * A CTA Link for a notification item
   */
  cta?: {
    content: string;
    link: string;
  };
}
