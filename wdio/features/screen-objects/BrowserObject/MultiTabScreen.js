import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  MULTI_TAB_ADD_BUTTON,
  MULTI_TAB_CLOSE_ALL_BUTTON,
  MULTI_TAB_DONE_BUTTON,
  MULTI_TAB_NO_TABS_MESSAGE,
  MULTI_TAB_SCREEN_ID,
} from '../../testIDs/BrowserScreen/MultiTab.testIds';

class MultiTabScreen {
  get screen() {
    return Selectors.getXpathElementByResourceId(MULTI_TAB_SCREEN_ID);
  }

  get closeAllButton() {
    return Selectors.getXpathElementByResourceId(MULTI_TAB_CLOSE_ALL_BUTTON);
  }

  get addButton() {
    return Selectors.getXpathElementByResourceId(MULTI_TAB_ADD_BUTTON);
  }

  get doneButton() {
    return Selectors.getXpathElementByResourceId(MULTI_TAB_DONE_BUTTON);
  }

  get noTabsMessage() {
    return Selectors.getXpathElementByResourceId(MULTI_TAB_NO_TABS_MESSAGE);
  }

  async isTabsViewDisplayed() {
    await expect(await this.screen).toBeDisplayed();
  }

  async tapCloseAllButton() {
    await Gestures.waitAndTap(this.closeAllButton);
  }

  async tapAddButton() {
    await Gestures.waitAndTap(this.addButton);
  }

  async tapDoneButton() {
    await Gestures.waitAndTap(this.doneButton);
  }

  async isNoTabsMessageDisplayed() {
    await expect(await this.noTabsMessage).toBeDisplayed();
  }
}

export default new MultiTabScreen();
