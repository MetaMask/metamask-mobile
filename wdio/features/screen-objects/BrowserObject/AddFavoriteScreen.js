import Selectors from '../../helpers/Selectors';
import {
  ADD_FAVORITE_SCREEN_ID,
  ADD_FAVORITE_TITLE_EDIT_TEXT,
  ADD_FAVORITE_URL_EDIT_TEXT,
  ADD_FAVORITE_ADD_BUTTON,
  ADD_FAVORITE_CANCEL_BUTTON,
} from '../../testIDs/BrowserScreen/AddFavorite.testIds';
import Gestures from '../../helpers/Gestures';

class AddFavoriteScreen {
  get screen() {
    return Selectors.getXpathElementByResourceId(ADD_FAVORITE_SCREEN_ID);
  }

  get titleEditText() {
    return Selectors.getXpathElementByResourceId(ADD_FAVORITE_TITLE_EDIT_TEXT);
  }

  get urlEditText() {
    return Selectors.getXpathElementByResourceId(ADD_FAVORITE_URL_EDIT_TEXT);
  }

  get addButton() {
    return Selectors.getXpathElementByResourceId(ADD_FAVORITE_ADD_BUTTON);
  }

  get cancelButton() {
    return Selectors.getXpathElementByResourceId(ADD_FAVORITE_CANCEL_BUTTON);
  }

  async isScreenDisplayed() {
    await expect(this.screen).toBeDisplayed();
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
