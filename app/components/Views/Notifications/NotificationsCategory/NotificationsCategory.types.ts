/**
 * NotificationsCategory component props.
 */
export interface NotificationsCategoryProps {
  /**
   * Currently selected category id.
   */
  selectedCategory: string;
  /**
   * Called with the selected category id whenever the user picks a tab.
   */
  onSelect: (categoryId: string) => void;
  /**
   * Optional test identifier applied to the tab bar wrapper.
   */
  testID?: string;
}
