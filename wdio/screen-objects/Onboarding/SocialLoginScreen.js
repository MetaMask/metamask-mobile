import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';
import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import { AccountStatusSelectorIDs } from '../../../app/components/Views/AccountStatus/AccountStatus.testIds';

class SocialLoginScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get iosNewUserTitle() {
    return AppwrightSelectors.getElementByID(
      this._device,
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_TITLE,
    );
  }

  get iosNewUserButton() {
    return AppwrightSelectors.getElementByID(
      this._device,
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
    );
  }

  get iosExistingUserTitle() {
    return AppwrightSelectors.getElementByID(
      this._device,
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_TITLE,
    );
  }

  get iosExistingUserButton() {
    return AppwrightSelectors.getElementByID(
      this._device,
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
    );
  }

  get accountFoundContainer() {
    return AppwrightSelectors.getElementByID(
      this._device,
      AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER,
    );
  }

  get accountFoundLoginButton() {
    return AppwrightSelectors.getElementByID(
      this._device,
      AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
    );
  }

  get accountNotFoundContainer() {
    return AppwrightSelectors.getElementByID(
      this._device,
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER,
    );
  }

  get accountNotFoundCreateButton() {
    return AppwrightSelectors.getElementByID(
      this._device,
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
    );
  }

  async isIosNewUserScreenVisible() {
    const element = await this.iosNewUserTitle;
    await appwrightExpect(element).toBeVisible({ timeout: 30000 });
  }

  async tapIosNewUserSetPinButton() {
    await AppwrightGestures.tap(await this.iosNewUserButton);
  }

  async isIosExistingUserScreenVisible() {
    const element = await this.iosExistingUserTitle;
    await appwrightExpect(element).toBeVisible({ timeout: 30000 });
  }

  async tapIosExistingUserSecureWalletButton() {
    await AppwrightGestures.tap(await this.iosExistingUserButton);
  }

  async isAccountFoundScreenVisible() {
    const element = await this.accountFoundContainer;
    await appwrightExpect(element).toBeVisible({ timeout: 30000 });
  }

  async tapAccountFoundLoginButton() {
    await AppwrightGestures.tap(await this.accountFoundLoginButton);
  }

  async isAccountNotFoundScreenVisible() {
    const element = await this.accountNotFoundContainer;
    await appwrightExpect(element).toBeVisible({ timeout: 30000 });
  }

  async tapAccountNotFoundCreateButton() {
    await AppwrightGestures.tap(await this.accountNotFoundCreateButton);
  }
}

export default new SocialLoginScreen();
