import Matchers from '../../framework/Matchers';
import {
  SNAP_SETTINGS_BACK_BUTTON,
  SNAP_SETTINGS_REMOVE_BUTTON,
  SNAP_SETTINGS_SCROLLVIEW,
} from '../../../app/components/Views/Snaps/SnapSettings/SnapSettings.constants';
import { SNAPS_SETTINGS_LIST_BACK_BUTTON } from '../../../app/components/Views/Snaps/SnapsSettingsList/SnapsSettingsList.constants';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SnapSettingsView {
  get enabledToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('snap-details-switch'),
      appium: () => PlaywrightMatchers.getElementById('snap-details-switch'),
    });
  }

  get removeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SNAP_SETTINGS_REMOVE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(SNAP_SETTINGS_REMOVE_BUTTON),
    });
  }

  get snapDetailsScrollViewMatcher(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(SNAP_SETTINGS_SCROLLVIEW);
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SNAP_SETTINGS_BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(SNAP_SETTINGS_BACK_BUTTON),
    });
  }

  get listBackButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SNAPS_SETTINGS_LIST_BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(SNAPS_SETTINGS_LIST_BACK_BUTTON),
    });
  }

  async toggleEnable(): Promise<void> {
    await UnifiedGestures.tap(this.enabledToggle, {
      elemDescription: 'Snap Settings - Toggle Button',
    });
  }

  async selectSnap(name: string): Promise<void> {
    const button = Matchers.getElementByText(name);
    await UnifiedGestures.tap(button, {
      elemDescription: `Snap Settings - ${name}`,
    });
  }

  async removeSnap(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.removeButton,
      this.snapDetailsScrollViewMatcher,
    );
    await UnifiedGestures.tap(this.removeButton, {
      elemDescription: `Snap Settings - Remove Snap`,
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.tapAtIndex(this.backButton, 0, {
      elemDescription: 'Snap Settings - Back Button',
    });
  }

  async tapListBackButton(): Promise<void> {
    await UnifiedGestures.tapAtIndex(this.listBackButton, 0, {
      elemDescription: 'Snaps List - Back Button',
    });
  }
}

export default new SnapSettingsView();
