import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';

class SnapSettingsView {
  get enabledToggle(): DetoxElement {
    return Matchers.getElementByID('snap-details-switch');
  }

  get removeButton(): DetoxElement {
    return Matchers.getElementByID('snap-settings-remove-button');
  }

  get snapDetailsScrollViewMatcher(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier('snap-settings-scrollview');
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  async toggleEnable(): Promise<void> {
    await Gestures.tap(this.enabledToggle, {
      elemDescription: 'Snap Settings - Toggle Button',
    });
  }

  async selectSnap(name: string): Promise<void> {
    const button = Matchers.getElementByText(name);
    await Gestures.tap(button, {
      elemDescription: `Snap Settings - ${name}`,
    });
  }

  async removeSnap(): Promise<void> {
    await Gestures.scrollToElement(
      this.removeButton,
      this.snapDetailsScrollViewMatcher,
    );
    await Gestures.tap(this.removeButton, {
      elemDescription: `Snap Settings - Remove Snap`,
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.tapAtIndex(this.backButton, 0, {
      elemDescription: 'Snap Settings - Back Button',
    });
  }
}

export default new SnapSettingsView();
