import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { EncapsulatedElementType, type ScrollContainer } from '../../framework';

class SnapSettingsView {
  get enabledToggle(): EncapsulatedElementType {
    return Matchers.getElementByID('snap-details-switch');
  }

  get removeButton(): EncapsulatedElementType {
    return Matchers.getElementByID('snap-settings-remove-button');
  }

  get snapDetailsScrollViewMatcher(): ScrollContainer {
    return Matchers.scrollContainer('snap-settings-scrollview');
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID('snap-settings-back-button');
  }

  get listBackButton(): EncapsulatedElementType {
    return Matchers.getElementByID('snaps-settings-list-back-button');
  }

  /**
   * Flip the Snap enable Switch once and verify the value changed.
   * Prefer {@link setEnabled} when the desired end state is known.
   */
  async toggleEnable(): Promise<void> {
    const currentlyOn = await Assertions.isToggleOn(this.enabledToggle);
    await this.setEnabled(!currentlyOn);
  }

  /**
   * Ensure the Snap details enable Switch is in the requested state.
   * Re-taps with fresh queries until the native value matches (Appium iOS
   * Switch taps can report success without flipping `value`).
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        if ((await Assertions.isToggleOn(this.enabledToggle)) === enabled) {
          return;
        }

        await Gestures.waitAndTap(this.enabledToggle, {
          elemDescription: `Snap Settings - Toggle to ${enabled ? 'on' : 'off'}`,
        });

        if (enabled) {
          await Assertions.expectToggleToBeOn(this.enabledToggle, {
            timeout: 5_000,
            description: 'Snap details switch should be on',
          });
          return;
        }

        await Assertions.expectToggleToBeOff(this.enabledToggle, {
          timeout: 5_000,
          description: 'Snap details switch should be off',
        });
      },
      {
        timeout: 20_000,
        description: `Snap details switch ${enabled ? 'on' : 'off'}`,
      },
    );
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
