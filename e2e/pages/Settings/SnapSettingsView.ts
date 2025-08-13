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
}

export default new SnapSettingsView();
