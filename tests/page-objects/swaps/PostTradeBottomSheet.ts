import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';
import { PostTradeBottomSheetTestIds } from '../../../app/components/UI/Bridge/components/PostTradeBottomSheet/PostTradeBottomSheet.testIds';

class PostTradeBottomSheet {
  get viewActivityButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON,
    );
  }

  async tapViewActivity(): Promise<void> {
    await Gestures.waitAndTap(this.viewActivityButton, {
      elemDescription: 'View Activity button in Post Trade Bottom Sheet',
    });
  }
}

export default new PostTradeBottomSheet();
