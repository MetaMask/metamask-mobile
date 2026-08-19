import {
  NotificationMenuViewSelectorsIDs,
  NotificationMenuViewSelectorsText,
} from '../../../app/components/Views/Notifications/NotificationMenuView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';

/** Matches `TEST_IDS.loadingContainer` in Notification List. */
const NOTIFICATION_LIST_LOADING_TEST_ID = 'notification-list-loading';

class NotificationMenuView {
  get title() {
    return Matchers.getElementByID(NotificationMenuViewSelectorsIDs.TITLE);
  }
  get all_tab() {
    return Matchers.getElementByText(NotificationMenuViewSelectorsText.ALL_TAB);
  }
  get wallet_tab() {
    return Matchers.getElementByText(
      NotificationMenuViewSelectorsText.WALLET_TAB,
    );
  }
  get announcements_tab() {
    return Matchers.getElementByText(
      NotificationMenuViewSelectorsText.ANNOUNCEMENTS_TAB,
    );
  }
  get scrollViewIdentifier() {
    return Matchers.scrollContainer(
      NotificationMenuViewSelectorsIDs.ITEM_LIST_SCROLLVIEW,
    );
  }

  get loadingIndicator() {
    return Matchers.getElementByID(NOTIFICATION_LIST_LOADING_TEST_ID);
  }

  selectNotificationItem(id: string) {
    return Matchers.getElementByID(NotificationMenuViewSelectorsIDs.ITEM(id));
  }

  /**
   * Wait until the notification FlatList has finished loading.
   * Feature announcements can appear before wallet notifications are merged;
   * callers that need wallet rows should use {@link waitForNotificationItem}
   * (scroll-based) rather than a bare hierarchy existence check.
   */
  async waitForListReady(timeout = 30_000): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.loadingIndicator, {
      timeout,
      description: 'notification list loading spinner gone',
    });
    await Assertions.expectElementToExist(
      Matchers.getElementByID(
        NotificationMenuViewSelectorsIDs.ITEM_LIST_SCROLLVIEW,
      ),
      {
        timeout,
        description: 'notification list scroll view',
      },
    );
  }

  async tapOnAllTab() {
    await Gestures.waitAndTap(this.all_tab);
  }
  async tapOnWalletTab() {
    await Gestures.waitAndTap(this.wallet_tab);
  }
  async tapOnAnnouncementsTab() {
    await Gestures.waitAndTap(this.announcements_tab);
  }
  async tapOnNotificationItem(id: string) {
    await Gestures.waitAndTap(this.selectNotificationItem(id), {
      elemDescription: `Notification Menu - Notification Item with ID: ${id}`,
    });
  }

  /**
   * Prove a notification row is in the list by scrolling it into view.
   *
   * FlatList virtualizes off-screen rows, so `expectElementToExist` alone can
   * time out even when mocks have merged — the item is simply not mounted yet.
   */
  async waitForNotificationItem(
    id: string,
    options?: { direction?: 'up' | 'down'; timeout?: number },
  ): Promise<void> {
    await this.scrollToNotificationItem(id, options);
  }

  async scrollToNotificationItem(
    id: string,
    options?: { direction?: 'up' | 'down'; timeout?: number },
  ): Promise<void> {
    // Bound the Appium scroll budget so a missing item fails fast with a clear
    // error instead of looping until the suite timeout (CI: ~3 minutes).
    // 40s → ~8 scrolls (GestureStrategy caps timeout/5000 between 3 and 12).
    await Gestures.scrollToElement(
      this.selectNotificationItem(id),
      this.scrollViewIdentifier,
      {
        elemDescription: `Notification Menu - scroll to item ${id}`,
        direction: options?.direction ?? 'down',
        timeout: options?.timeout ?? 40_000,
      },
    );
  }
}

export default new NotificationMenuView();
