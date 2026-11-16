import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { SocialV1ViewSelectorsIDs } from '../../../app/components/Views/SocialLeaderboard/SocialV1View/SocialV1View.testIds';

class SocialV1View {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(SocialV1ViewSelectorsIDs.CONTAINER);
  }

  get plusButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(SocialV1ViewSelectorsIDs.PLUS_BUTTON);
  }

  /**
   * Trending is the first Social V1 tab. TabsBar assigns
   * `${tabsTestID}-tab-${index}` when a tab has no testID of its own.
   */
  get trendingTab(): Promise<AppiumElement> {
    return Matchers.getElementByID(`${SocialV1ViewSelectorsIDs.TABS}-tab-0`);
  }

  /**
   * Opens the post composer. A wallet without a Social profile is sent to
   * profile onboarding instead.
   */
  async tapPlusButton(): Promise<void> {
    await Gestures.waitAndTap(this.plusButton, {
      elemDescription: 'Social home - Post button',
    });
  }
}

export default new SocialV1View();
