import TestHelpers from '../../helpers';
import { MULTI_TAB_ADD_BUTTON } from '../../../wdio/screen-objects/testIDs/BrowserScreen/MultiTab.testIds';
import {
  BROWSER_SCREEN_ID,
  HOME_BUTTON,
  TABS_BUTTON,
  OPTIONS_BUTTON,
  SEARCH_BUTTON,
  NAVBAR_TITLE_NETWORK,
  ANDROID_BROWSER_WEBVIEW_ID,
} from '../../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';
import { URL_INPUT_BOX_ID } from '../../../wdio/screen-objects/testIDs/BrowserScreen/AddressBar.testIds';
import { NOTIFICATION_TITLE } from '../../../wdio/screen-objects/testIDs/Components/Notification.testIds';
import {
  testDappConnectButtonCooridinates,
  testDappSendEIP1559ButtonCoordinates,
} from '../../viewHelper';
import { TEST_DAPP_LOCAL_URL } from '../TestDApp';
import {
  BrowserViewSelectorsIDs,
  BrowserViewSelectorsText,
} from '../../selectors/BrowserView.selectors';
import { CommonSelectorsText } from '../../selectors/Common.selectors';
import { AccountOverviewSelectorsIDs } from '../../selectors/AccountOverview.selectors';
import { AddBookmarkViewSelectorsIDs } from '../../selectors/AddBookmarkView.selectors';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';

export default class Browser {
  static async tapUrlInputBox() {
    await TestHelpers.waitAndTap(NAVBAR_TITLE_NETWORK);
    await TestHelpers.delay(1000);
  }

  static async tapBottomSearchBar() {
    await TestHelpers.waitAndTap(SEARCH_BUTTON);
  }

  static async tapOptionsButton() {
    await TestHelpers.waitAndTap(OPTIONS_BUTTON);
    await TestHelpers.checkIfExists(OPTIONS_BUTTON);
  }

  static async tapOpenAllTabsButton() {
    await TestHelpers.checkIfExists(TABS_BUTTON);
    await TestHelpers.waitAndTap(TABS_BUTTON);
  }

  static async tapOpenNewTabButton() {
    await TestHelpers.waitAndTap(MULTI_TAB_ADD_BUTTON);
  }
  static async tapNetworkAvatarButtonOnBrowser() {
    await TestHelpers.waitAndTap(BrowserViewSelectorsIDs.AVATAR_IMAGE);
  }

  static async tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.delay(3000); // to wait until toast notifcation disappears
      await TestHelpers.tapByDescendentTestID(
        AccountOverviewSelectorsIDs.ACCOUNT_BUTTON,
        BrowserViewSelectorsIDs.AVATAR_IMAGE,
      );
    } else {
      await this.tapNetworkAvatarButtonOnBrowser();
    }
  }

  static async tapAddToFavoritesButton() {
    await TestHelpers.tapByText(BrowserViewSelectorsText.ADD_FAVORITES_BUTTON);
  }

  static async tapAddBookmarksButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON,
      );
    } else {
      await TestHelpers.waitAndTap(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON);
    }
  }
  static async tapHomeButton() {
    await TestHelpers.tap(HOME_BUTTON);
  }

  static async tapBackToSafetyButton() {
    await TestHelpers.tapByText(BrowserViewSelectorsText.BACK_TO_SAFETY_BUTTON);
  }
  static async tapReturnHomeButton() {
    await TestHelpers.tapByText(BrowserViewSelectorsText.RETURN_HOME);
  }

  static async navigateToURL(url) {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.clearField(URL_INPUT_BOX_ID);
      await TestHelpers.typeTextAndHideKeyboard(URL_INPUT_BOX_ID, url);
      await TestHelpers.delay(2000);
    } else {
      await TestHelpers.clearField(URL_INPUT_BOX_ID);
      await TestHelpers.replaceTextInField(URL_INPUT_BOX_ID, url);
      await element(by.id(URL_INPUT_BOX_ID)).tapReturnKey();
    }
  }
  static async scrollToTakeTourOnBrowserPage() {
    // Scroll on browser to show tutorial box and tap to skip
    if (device.getPlatform() === 'ios') {
      await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up');
    } else {
      await TestHelpers.checkIfExists(ANDROID_BROWSER_WEBVIEW_ID);
      await TestHelpers.swipe(ANDROID_BROWSER_WEBVIEW_ID, 'up');
      await TestHelpers.delay(1000);
    }
  }

  static async goToTestDappAndTapConnectButton() {
    await TestHelpers.delay(3000);
    await this.tapUrlInputBox();
    await this.navigateToURL(TEST_DAPP);
    await TestHelpers.delay(3000);
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappConnectButtonCooridinates,
      );
    } else {
      await TestHelpers.delay(3000);
      await this.tapConnectButton();
    }
  }

  /** @deprecated **/
  static async tapConnectButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapWebviewElement(
        BrowserViewSelectorsIDs.DAPP_CONNECT_BUTTON,
      );
    } else {
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappConnectButtonCooridinates,
      );
    }
  }

  // The tapConnectButton() above has incorrect logic - "()" are missed
  // Please change existing tests to use the following method
  static async tapConnectButtonNew() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapWebviewElement(
        BrowserViewSelectorsIDs.DAPP_CONNECT_BUTTON,
      );
    } else {
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappConnectButtonCooridinates,
      );
    }
  }

  static async tapSendEIP1559() {
    // this method only works for android // at this moment in time only android supports interacting with webviews:https://wix.github.io/Detox/docs/api/webviews

    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up', 'slow', 0.5);
      await TestHelpers.delay(1500);
      await TestHelpers.tapWebviewElement(
        BrowserViewSelectorsIDs.DAPP_EIP1559_BUTTON,
      );
    } else {
      await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up', 'slow', 0.1); // scrolling to the SendEIP1559 button
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappSendEIP1559ButtonCoordinates,
      );
    }
    await TestHelpers.tapByText(BrowserViewSelectorsText.CONFIRM_BUTTON, 1);
  }
  static async waitForBrowserPageToLoad() {
    await TestHelpers.delay(5000);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(BROWSER_SCREEN_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(BROWSER_SCREEN_ID);
  }

  static async isAddBookmarkScreenVisible() {
    await TestHelpers.checkIfVisible(AddBookmarkViewSelectorsIDs.CONTAINER);
  }

  static async isAddBookmarkScreenNotVisible() {
    await TestHelpers.checkIfNotVisible(AddBookmarkViewSelectorsIDs.CONTAINER);
  }

  static async isBackToSafetyButtonVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      BrowserViewSelectorsText.BACK_TO_SAFETY_BUTTON,
    );
  }
  static async isAccountToastVisible(accountName) {
    const connectedAccountMessage = `${accountName} ${CommonSelectorsText.TOAST_CONNECTED_ACCOUNTS}`;
    await TestHelpers.checkIfElementHasString(
      NOTIFICATION_TITLE,
      connectedAccountMessage,
    );
  }

  static async isRevokeAllAccountToastVisible() {
    await TestHelpers.checkIfElementHasString(
      NOTIFICATION_TITLE,
      CommonSelectorsText.TOAST_REVOKE_ACCOUNTS,
    );
  }

  static async navigateToTestDApp() {
    await this.tapUrlInputBox();
    await this.navigateToURL(TEST_DAPP_LOCAL_URL);
  }

  static async isURLBarTextTestDapp() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      BrowserViewSelectorsText.METAMASK_TEST_DAPP_URL,
      0,
    );
  }
}
