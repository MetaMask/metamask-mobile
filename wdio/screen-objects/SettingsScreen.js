import Selectors from '../helpers/Selectors';
import { LOCK_SETTINGS } from './testIDs/Screens/Settings.testIds';
import Gestures from '../helpers/Gestures';
import { SettingsViewSelectorsIDs } from '../../e2e/selectors/Settings/SettingsView.selectors';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class SettingsScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get lockOption() {
    if (!this._device) {
      return Selectors.getElementByPlatform(LOCK_SETTINGS);
    } else {
      return AppwrightSelectors.getElementByID(this._device, LOCK_SETTINGS);
    }
  }

  get generalSettings() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        SettingsViewSelectorsIDs.GENERAL,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, SettingsViewSelectorsIDs.GENERAL);
    }
  }

  get securityAndPrivacy() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        SettingsViewSelectorsIDs.GENERAL,
      );
    } else {
      return AppwrightSelectors.getElementByCatchAll(this._device, 'Security & Privacy');
    }
  }

  async waitForDisplay() {
    if (!this._device) {
      const element = await this.generalSettings;
      await element.waitForDisplayed();
    } else {
      const element = await this.generalSettings;
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async tapLockOption(defaultLockOption = '30 seconds',updatedLockOption = 'Immediately') {
    if (!this._device) {
      const lockOption = await this.lockOption;
      while (!(await lockOption.isDisplayed())) {
        await Gestures.swipeUp();
      }
      await Gestures.waitAndTap(lockOption);
    } else {
      const lockOption = await AppwrightSelectors.getElementByText(this._device, defaultLockOption);
      // Scroll into view if needed
      const updatedOption = await AppwrightSelectors.getElementByText(this._device, updatedLockOption);
      await AppwrightGestures.tap(lockOption);
      await AppwrightGestures.tap(updatedOption);
    }
  }

  async tapSecurityAndPrivacy() {
    if (!this._device) {
      const lockOption = await this.lockOption;
      while (!(await lockOption.isDisplayed())) {
        await Gestures.swipeUp();
      }
      await Gestures.waitAndTap(lockOption);
    } else {

      await AppwrightGestures.tap(this.securityAndPrivacy);
    }
  }
}

export default new SettingsScreen();
