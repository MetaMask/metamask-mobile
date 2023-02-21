import Selectors from '../../helpers/Selectors';
import {
  FAVORITE_SCREEN_ID,
  FAVORITE_TITLE_EDIT_TEXT,
  FAVORITE_URL_EDIT_TEXT,
  FAVORITE_ADD_BUTTON,
  FAVORITE_CANCEL_BUTTON,
} from '../testIDs/BrowserScreen/AddFavorite.testIds';
import Gestures from '../../helpers/Gestures';

class AddFavoriteScreen {
  get screen() {
    return Selectors.getXpathElementByResourceId(FAVORITE_SCREEN_ID);
  }

  get titleEditText() {
    return Selectors.getXpathElementByResourceId(FAVORITE_TITLE_EDIT_TEXT);
  }

  get urlEditText() {
    return Selectors.getXpathElementByResourceId(FAVORITE_URL_EDIT_TEXT);
  }

  get addButton() {
    return Selectors.getElementByPlatform(FAVORITE_ADD_BUTTON);
  }

  get cancelButton() {
    return Selectors.getElementByPlatform(FAVORITE_CANCEL_BUTTON);
  }

  async isScreenDisplayed() {
    await expect(await this.screen).toBeDisplayed();
  }

  async titleEditTextContains(expectedTitle) {
    const textFromElement = await this.titleEditText;
    const actualTitle = await textFromElement.getText();
    await expect(expectedTitle).toContain(actualTitle);
  }

  async editTitleEditText(title) {
    await Gestures.typeText(this.titleEditText, title);
  }

  async urlEditTextContains(expectedUrl) {
    const textFromElement = await this.urlEditText;
    const actualUrl = await textFromElement.getText();
    await expect(expectedUrl).toContain(actualUrl);
  }

  async editUrlEditText(title) {
    await Gestures.typeText(this.urlEditText, title);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapAddButton() {
    await Gestures.waitAndTap(this.addButton);
  }
}

export default new AddFavoriteScreen();
