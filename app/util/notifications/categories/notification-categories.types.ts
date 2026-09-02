export const ALL_NOTIFICATIONS_CATEGORY_ID = 'all';

export interface NotificationCategoryMetadata {
  categoryId: string;
  ausKeys: string[];
  label: string;
  description: string;
  icon: string;
}
