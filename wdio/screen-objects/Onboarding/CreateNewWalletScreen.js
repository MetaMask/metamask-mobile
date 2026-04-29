import {
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  I_UNDERSTAND_BUTTON_ID,
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  REMIND_LATER_BUTTON_ID,
  SUBMIT_BUTTON,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
} from "../testIDs/Screens/WalletSetupScreen.testIds";
import Gestures from "../../helpers/Gestures";
import Selectors from "../../helpers/Selectors";
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect } from "appwright";
import { ChoosePasswordSelectorsIDs } from "../../../app/components/Views/ChoosePassword/ChoosePassword.testIds";
import { iosPasswordInputXpath } from './iosPasswordInputXpath.js';

class CreateNewWalletScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get description() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        WALLET_SETUP_SCREEN_DESCRIPTION_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        WALLET_SETUP_SCREEN_DESCRIPTION_ID,
      );
    }
  }

  get secureWalletScreen() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        PROTECT_YOUR_WALLET_CONTAINER_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        PROTECT_YOUR_WALLET_CONTAINER_ID,
      );
    }
  }

  get remindMeLaterButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(REMIND_LATER_BUTTON_ID);
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        REMIND_LATER_BUTTON_ID,
      );
    }
  }

  get newWalletPasswordField() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        CREATE_PASSWORD_INPUT_FIRST_FIELD,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByXpath(
          this._device,
          `//android.widget.EditText[contains(@resource-id,'${CREATE_PASSWORD_INPUT_FIRST_FIELD}') or ancestor::*[contains(@resource-id,'${CREATE_PASSWORD_INPUT_FIRST_FIELD}')]]`,
        );
      } else {
        return AppwrightSelectors.getElementByXpath(
          this._device,
          iosPasswordInputXpath(CREATE_PASSWORD_INPUT_FIRST_FIELD, 1),
        );
      }
    }
  }

  get newWalletPasswordConfirm() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByXpath(
          this._device,
          `//android.widget.EditText[contains(@resource-id,'${CONFIRM_PASSWORD_INPUT_FIRST_FIELD}') or ancestor::*[contains(@resource-id,'${CONFIRM_PASSWORD_INPUT_FIRST_FIELD}')]]`,
        );
      } else {
        return AppwrightSelectors.getElementByXpath(
          this._device,
          iosPasswordInputXpath(CONFIRM_PASSWORD_INPUT_FIRST_FIELD, 2),
        );
      }
    }
  }

  get termsAndConditionCheckBox() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(I_UNDERSTAND_BUTTON_ID);
    } else {
      return AppwrightSelectors.getElementByID(
        this._device,
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
    }
  }

  get newWalletSubmitButton() {
    if (!this._device) {
      return Selectors.getXpathByContentDesc(SUBMIT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SUBMIT_BUTTON);
    }
  }

  async inputPasswordInFirstField(firstPassword) {
    if (!this._device) {
      await Gestures.typeText(this.newWalletPasswordField, firstPassword);
    } else {
      const field = await this.newWalletPasswordField;
      await AppwrightGestures.typeText(field, firstPassword, {
        tapBeforeFill: AppwrightSelectors.isAndroid(this._device),
        maxRetries: 2,
        retryDelay: 500,
      });
    }
  }

  async inputConfirmPasswordField(secondPassword) {
    if (!this._device) {
      await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword);
      await driver.hideKeyboard();
      await Gestures.waitAndTap(this.termsAndConditionCheckBox);
      // await Gestures.waitAndTap(this.screenTitle);
      await driver.pause(2500);
      // await Gestures.tap('Create password');
    } else {
      const field = await this.newWalletPasswordConfirm;
      await AppwrightGestures.typeText(field, secondPassword, {
        tapBeforeFill: AppwrightSelectors.isAndroid(this._device),
        maxRetries: 2,
        retryDelay: 500,
      });
    }
  }

  async inputConfirmResetPasswordField(secondPassword) {
    await Gestures.typeText(this.newWalletPasswordConfirm, secondPassword);
    await driver.hideKeyboard();
  }

  async tapSubmitButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.newWalletSubmitButton);
    } else {
      const button = await this.newWalletSubmitButton;
      await button.tap();
    }
  }

  async tapRemindMeLater() {
    if (!this._device) {
      await Gestures.waitAndTap(this.remindMeLaterButton);
    } else {
      const button = await this.remindMeLaterButton;
      await button.tap();
    }
  }

  async isAccountCreated() {
    await driver.pause(5000);
    await expect(this.secureWalletScreen).toBeDisplayed();
  }

  async isNewAccountScreenFieldsVisible() {
    if (!this._device) {
      await expect(this.newWalletPasswordField).toBeVisible();
    } else {
      const element = await this.newWalletPasswordField;
      await expect(element).toBeVisible();
    }
  }

  async isNotVisible() {
    const secureWalletScreen = await this.secureWalletScreen;
    await secureWalletScreen.waitForExist({ reverse: true });
  }
}

export default new CreateNewWalletScreen();
