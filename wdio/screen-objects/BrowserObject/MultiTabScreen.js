import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';

class MultiTabScreen {
  get closeAllButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.CLOSE_ALL_TABS);
  }

  get addButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.ADD_NEW_TAB);
  }

  get doneButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.DONE_BUTTON);
  }

  get noTabsMessage() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.NO_TABS_MESSAGE);
  }

  async isTabsViewDisplayed() {
    await expect(await this.addButton).toBeDisplayed();
  }

  async tapCloseAllButton() {
    await Gestures.waitAndTap(this.closeAllButton);
  }

  async tapAddButton() {
    const element = await this.addButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.addButton);
    await element.waitForExist({ reverse: true });
  }

  async tapDoneButton() {
    await Gestures.waitAndTap(this.doneButton);
  }

  async isNoTabsMessageDisplayed() {
    await expect(await this.noTabsMessage).toBeDisplayed();
  }
}

export default new MultiTabScreen();
