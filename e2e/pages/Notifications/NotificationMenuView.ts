import {
  NotificationMenuViewSelectorsIDs,
  NotificationMenuViewSelectorsText,
} from '../../selectors/Notifications/NotificationMenuView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

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
    await Gestures.waitAndTap(this.selectNotificationItem(id));
  }
  async scrollToNotificationItem(id: string) {
    await Gestures.scrollToElement(
      this.selectNotificationItem(id),
      this.scrollViewIdentifier,
    );
  }
}

export default new EnableNotificationsModal();
