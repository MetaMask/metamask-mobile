import { useQuery } from '@tanstack/react-query';
import I18n from '../../../../locales/i18n';
import { fetchNotificationCategories } from './notification-categories-api';
import type { NotificationCategoryMetadata } from './notification-categories.types';

export const notificationCategoriesKeys = {
  list: (locale: string) => ['NotificationCategories', 'list', locale] as const,
};

export interface UseNotificationCategoriesResult {
  categories: NotificationCategoryMetadata[];
  isLoading: boolean;
}

export function useNotificationCategories(): UseNotificationCategoriesResult {
  const locale = I18n.locale;
  const { data, isLoading } = useQuery({
    queryKey: notificationCategoriesKeys.list(locale),
    queryFn: () => fetchNotificationCategories(locale),
    staleTime: Infinity,
  });

  return { categories: data ?? [], isLoading };
}
