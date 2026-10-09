import { AddBookmarkViewSelectorsIDs } from '../../../app/components/Views/AddBookmark/AddBookmarkView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';

class AddFavoritesView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONTAINER);
  }

  get addBookmarkButton(): Promise<AppiumElement> {
    return PlatformDetector.isIOS()
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
