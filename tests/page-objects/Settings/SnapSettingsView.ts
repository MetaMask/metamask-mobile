import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

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
    return Matchers.getElementByID('snap-settings-back-button');
  }

  get listBackButton(): DetoxElement {
    return Matchers.getElementByID('snaps-settings-list-back-button');
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
    await Gestures.tap(this.backButton, {
      elemDescription: 'Snap Settings - Back Button',
    });
  }

  async tapListBackButton(): Promise<void> {
    await Gestures.tap(this.listBackButton, {
      elemDescription: 'Snaps List - Back Button',
    });
  }
}

export default new SnapSettingsView();
