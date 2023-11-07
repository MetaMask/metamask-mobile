import Selectors from '../../helpers/Selectors';
import {
  ADD_BOOKMARKS_SCREEN_ID,
  FAVORITE_TITLE_EDIT_TEXT,
  FAVORITE_URL_EDIT_TEXT,
} from '../testIDs/BrowserScreen/AddFavorite.testIds';
import Gestures from '../../helpers/Gestures';

class AddFavoriteScreen {
  get screen() {
    return Selectors.getElementByPlatform(ADD_BOOKMARKS_SCREEN_ID);
  }

  get titleEditText() {
    return Selectors.getElementByPlatform(FAVORITE_TITLE_EDIT_TEXT);
  }

  get urlEditText() {
    return Selectors.getElementByPlatform(FAVORITE_URL_EDIT_TEXT);
  }

  get addButton() {
    return Selectors.getXpathElementByText('Add');
  }

  get cancelButton() {
    return Selectors.getXpathElementByText('Cancel');
  }

  async isScreenDisplayed() {
    await expect(await this.screen).toBeDisplayed();
  }

  async titleEditTextContains(expectedTitle) {
    await expect(this.titleEditText).toHaveText(expectedTitle);
  }

  async editTitleEditText(title) {
    await Gestures.typeText(this.titleEditText, title);
  }

  async urlEditTextContains(expectedUrl) {
    await expect(this.urlEditText).toHaveText(expectedUrl);
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
