import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { AddBookmarkViewSelectorsIDs } from '../../../app/components/Views/AddBookmark/AddBookmarkView.testIds';

class AddFavoriteScreen {
  get screen() {
    return Selectors.getElementByPlatform(AddBookmarkViewSelectorsIDs.CONTAINER);
  }

  get titleEditText() {
    return Selectors.getElementByPlatform(AddBookmarkViewSelectorsIDs.BOOKMARK_TITLE);
  }

  get urlEditText() {
    return Selectors.getElementByPlatform(AddBookmarkViewSelectorsIDs.URL_TEXT);
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
