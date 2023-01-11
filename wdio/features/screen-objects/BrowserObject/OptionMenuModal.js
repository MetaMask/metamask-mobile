import Gestures from '../../helpers/Gestures';
import Selectors from '../../../features/helpers/Selectors';
import {
  ADD_FAVORITES_OPTION,
  MENU_ID,
  NEW_TAB_OPTION,
  OPEN_IN_BROWSER_OPTION,
  RELOAD_OPTION,
  SHARE_OPTION,
  SWITCH_NETWORK_OPTION,
} from '../../testIDs/BrowserScreen/OptionMenu.testIds';

class OptionMenuModal {
  get menu() {
    return Selectors.getElementByPlatform(MENU_ID);
  }

  get addFavoriteOption() {
    return Selectors.getElementByPlatform(ADD_FAVORITES_OPTION);
  }

  get newTabOption() {
    return Selectors.getElementByPlatform(NEW_TAB_OPTION);
  }

  get reloadOption() {
    return Selectors.getElementByPlatform(RELOAD_OPTION);
  }

  get shareOption() {
    return Selectors.getElementByPlatform(SHARE_OPTION);
  }

  get openBrowserOption() {
    return Selectors.getElementByPlatform(OPEN_IN_BROWSER_OPTION);
  }

  get switchNetworkOption() {
    return Selectors.getElementByPlatform(SWITCH_NETWORK_OPTION);
  }

  async isModalDisplayed() {
    await expect(await this.menu).toBeDisplayed();
  }

  async isModalNotDisplayed() {
    await expect(await this.menu).not.toBeDisplayed();
  }

  async tapAddFavoriteOption() {
    await Gestures.waitAndTap(this.addFavoriteOption);
  }

  async isAddFavoriteOptionDisplayed() {
    await expect(await this.addFavoriteOption).toBeDisplayed();
  }

  async isAddFavoriteOptionNotDisplayed() {
    await expect(await this.addFavoriteOption).not.toBeDisplayed();
  }

  async tapNewTabOption() {
    await Gestures.waitAndTap(this.newTabOption);
  }

  async isNewTabOptionDisplayed() {
    await expect(await this.newTabOption).toBeDisplayed();
  }

  async tapReloadOption() {
    await Gestures.waitAndTap(this.reloadOption);
  }

  async isReloadOptionDisplayed() {
    await expect(await this.reloadOption).toBeDisplayed();
  }

  async tapShareOption() {
    await Gestures.waitAndTap(this.shareOption);
  }

  async isShareOptionDisplayed() {
    await expect(await this.shareOption).toBeDisplayed();
  }

  async isOpenBrowserOptionDisplayed() {
    await expect(await this.openBrowserOption).toBeDisplayed();
  }

  async tapSwitchOption() {
    await Gestures.waitAndTap(this.switchNetworkOption);
  }

  async isSwitchOptionDisplayed() {
    await expect(await this.switchNetworkOption).toBeDisplayed();
  }
}

export default new OptionMenuModal();
