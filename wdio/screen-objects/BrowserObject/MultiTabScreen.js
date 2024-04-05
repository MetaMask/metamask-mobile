import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  MULTI_TAB_ADD_BUTTON,
  MULTI_TAB_CLOSE_ALL_BUTTON,
  MULTI_TAB_DONE_BUTTON,
  MULTI_TAB_NO_TABS_MESSAGE,
} from '../testIDs/BrowserScreen/MultiTab.testIds';

class MultiTabScreen {
  get closeAllButton() {
    return Selectors.getElementByPlatform(MULTI_TAB_CLOSE_ALL_BUTTON);
  }

  get addButton() {
    return Selectors.getElementByPlatform(MULTI_TAB_ADD_BUTTON);
  }

  get doneButton() {
    return Selectors.getElementByPlatform(MULTI_TAB_DONE_BUTTON);
  }

  get noTabsMessage() {
    return Selectors.getElementByPlatform(MULTI_TAB_NO_TABS_MESSAGE);
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
