import Gestures from 'wdio/features/helpers/Gestures';
import {
  ADD_FAVORITES_OPTION,
  MENU_ID,
  NEW_TAB_OPTION,
  OPEN_IN_BROWSER_OPTION,
  RELOAD_OPTION,
  SHARE_OPTION,
  SWITCH_NETWORK_OPTION,
} from 'wdio/features/testIDs/BrowserScreen/OptionMenu.testIds';
import Selectors from '../../../features/helpers/Selectors';

class OptionMenuModal {
  get menu() {
    return Selectors.getXpathElementByContentDescription(MENU_ID);
  }

  get addFavoriteOption() {
    return Selectors.getXpathElementByContentDescription(ADD_FAVORITES_OPTION);
  }

  get newTabOption() {
    return Selectors.getXpathElementByContentDescription(NEW_TAB_OPTION);
  }

  get reloadOption() {
    return Selectors.getXpathElementByContentDescription(RELOAD_OPTION);
  }

  get shareOption() {
    return Selectors.getXpathElementByContentDescription(SHARE_OPTION);
  }

  get openBrowserOption() {
    return Selectors.getXpathElementByContentDescription(
      OPEN_IN_BROWSER_OPTION,
    );
  }

  get switchNetworkOption() {
    return Selectors.getXpathElementByContentDescription(SWITCH_NETWORK_OPTION);
  }

  async isModalDisplayed() {
    await expect(this.menu).toBeDisplayed();
  }

  async tapAddFavoriteOption() {
    await Gestures.waitAndTap(this.addFavoriteOption);
  }

  async isAddFavoriteOptionDisplayed() {
    await expect(this.addFavoriteOption).toBeDisplayed();
  }

  async tapNewTabOption() {
    await Gestures.waitAndTap(this.newTabOption);
  }

  async isNewTabOptionDisplayed() {
    await expect(this.newTabOption).toBeDisplayed();
  }

  async tapReloadOption() {
    await Gestures.waitAndTap(this.reloadOption);
  }

  async isReloadOptionDisplayed() {
    await expect(this.reloadOption).toBeDisplayed();
  }

  async tapShareOption() {
    await Gestures.waitAndTap(this.shareOption);
  }

  async isShareOptionDisplayed() {
    await expect(this.shareOption).toBeDisplayed();
  }

  async tapOpenBrowserOption() {
    await Gestures.waitAndTap(this.openBrowserOption);
  }

  async isOpenBrowserOptionDisplayed() {
    await expect(this.openBrowserOption).toBeDisplayed();
  }

  async tapSwitchOption() {
    await Gestures.waitAndTap(this.switchNetworkOption);
  }

  async isSwitchptionDisplayed() {
    await expect(this.switchNetworkOption).toBeDisplayed();
  }
}

export default new OptionMenuModal();
