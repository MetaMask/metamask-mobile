// @ts-check
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

  selectNotificationItem(
    /** @type {string} */
    id,
  ) {
    return Matchers.getElementByID(NotificationMenuViewSelectorsIDs.ITEM(id));
  }

  async tapOnWalletTab() {
    await Gestures.waitAndTap(this.wallet_tab);
  }
  async tapOnAnnouncementsTab() {
    await Gestures.waitAndTap(this.announcements_tab);
  }
  async tapOnNotificationItem(
    /** @type {string} */
    id,
  ) {
    await Gestures.waitAndTap(this.selectNotificationItem(id));
  }
}

export default new EnableNotificationsModal();
