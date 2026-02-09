import { AddBookmarkViewSelectorsIDs } from '../../../app/components/Views/AddBookmark/AddBookmarkView.testIds.ts';
import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';

class AddFavoritesView {
  get container(): DetoxElement {
    return Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONTAINER);
  }

  get addBookmarkButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON)
      : Matchers.getElementByLabel(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON);
  }

  async tapAddBookmarksButton(): Promise<void> {
    await Gestures.waitAndTap(this.addBookmarkButton, {
      elemDescription: 'Tap on the add bookmark button',
    });
  }
}

export default new AddFavoritesView();
