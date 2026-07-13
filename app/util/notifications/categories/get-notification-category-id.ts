export function getNotificationCategoryId(
  notification: unknown,
): string | undefined {
  return (notification as { category?: string }).category;
}
