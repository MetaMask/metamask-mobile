import { AddBookmarkViewSelectorsIDs } from '../../../app/components/Views/AddBookmark/AddBookmarkView.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddFavoritesView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddBookmarkViewSelectorsIDs.CONTAINER,
        ),
    });
  }

  get addBookmarkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON)
          : Matchers.getElementByLabel(
              AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON,
            ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON,
        ),
    });
  }

  async tapAddBookmarksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addBookmarkButton, {
      elemDescription: 'Tap on the add bookmark button',
    });
  }
}

export default new AddFavoritesView();
