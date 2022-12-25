import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  ADD_BUTTON,
  CLOSE_ALL_BUTTON,
  DONE_BUTTON,
  NO_TABS_MESSAGE,
  SCREEN_ID,
} from 'wdio/features/testIDs/BrowserScreen/MultiTab.testIds';

class MultiTabScreen {
  get screen() {
    return Selectors.getXpathElementByResourceId(SCREEN_ID);
  }

  get closeAllButton() {
    return Selectors.getXpathElementByResourceId(CLOSE_ALL_BUTTON);
  }

  get addButton() {
    return Selectors.getXpathElementByResourceId(ADD_BUTTON);
  }

  get doneButton() {
    return Selectors.getXpathElementByResourceId(DONE_BUTTON);
  }

  get noTabsMessage() {
    return Selectors.getXpathElementByResourceId(NO_TABS_MESSAGE);
  }

  async isTabsViewDisplayed() {
    await expect(this.screen).toBeDisplayed();
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
    await expect(this.noTabsMessage).toBeDisplayed();
  }
}

export default new MultiTabScreen();
