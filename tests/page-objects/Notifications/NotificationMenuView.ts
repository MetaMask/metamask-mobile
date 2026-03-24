import {
  NotificationMenuViewSelectorsIDs,
  NotificationMenuViewSelectorsText,
} from '../../../app/components/Views/Notifications/NotificationMenuView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class EnableNotificationsModal {
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
    return Matchers.getIdentifier(
      NotificationMenuViewSelectorsIDs.ITEM_LIST_SCROLLVIEW,
    );
  }

  selectNotificationItem(id: string) {
    return Matchers.getElementByID(
      NotificationMenuViewSelectorsIDs.ITEM(id),
    ) as Promise<IndexableNativeElement>;
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
  async scrollToNotificationItem(id: string) {
    await Gestures.scrollToElement(
      this.selectNotificationItem(id),
      this.scrollViewIdentifier,
    );
  }
}

export default new EnableNotificationsModal();
