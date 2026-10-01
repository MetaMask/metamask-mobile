export const NotificationsCategorySelectorsIDs = {
  CONTAINER: 'notifications-category',
  ALL: 'notifications-category-all',
  SKELETON: 'notifications-category-skeleton',
} as const;

export const categoryTestID = (categoryId: string) =>
  `notifications-category-${categoryId}`;
