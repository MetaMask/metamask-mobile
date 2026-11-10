import { useHasUnreadNotifications } from './useHasUnreadNotifications';
import { useCardUkMigrationUpdateBadge } from '../UI/Card/hooks/useCardUkMigrationUpdateBadge';

/**
 * Whether an entry point into the Accounts menu should show an attention dot.
 *
 * Mirrors the badges rendered on the rows inside the Accounts menu itself, so
 * the dot appears whenever there is something in there to act on: unread
 * notifications, or the Card UK migration "Update" tag.
 */
export const useAccountsMenuAttention = (): boolean => {
  const hasUnreadNotifications = useHasUnreadNotifications();
  const cardUpdateBadgeSeverity = useCardUkMigrationUpdateBadge();

  return hasUnreadNotifications || Boolean(cardUpdateBadgeSeverity);
};
