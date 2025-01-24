import { AddBookmarkViewSelectorsIDs } from '../../selectors/Browser/AddBookmarkView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class AddFavoritesView {
  get container() {
    return Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONTAINER);
  }

  get addBookmarkButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON)
      : Matchers.getElementByLabel(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON);
  }

  async tapAddBookmarksButton() {
    await Gestures.waitAndTap(this.addBookmarkButton);
  }
}

export default new AddFavoritesView();
