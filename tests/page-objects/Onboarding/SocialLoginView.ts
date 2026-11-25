import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';
import { AccountStatusSelectorIDs } from '../../../app/components/Views/AccountStatus/AccountStatus.testIds';

class SocialLoginView {
  get accountFoundContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER,
    );
  }

  get accountFoundTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE,
    );
  }

  get accountFoundLoginButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
    );
  }

  get accountFoundDifferentMethodButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON,
    );
  }

  async isAccountFoundScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.accountFoundContainer, {
      timeout: 30000,
      description: 'Account Already Exists screen should be visible',
    });
  }

  async tapLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.accountFoundLoginButton, {
      elemDescription: 'Login button on Account Already Exists screen',
    });
  }

  async tapAccountFoundLoginButton(): Promise<void> {
    await this.tapLoginButton();
  }

  get accountNotFoundContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER,
    );
  }

  get accountNotFoundTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE,
    );
  }

  get accountNotFoundCreateButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
    );
  }

  async isAccountNotFoundScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.accountNotFoundContainer, {
      timeout: 30000,
      description: 'Account Not Found screen should be visible',
    });
  }

  async tapCreateNewWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.accountNotFoundCreateButton, {
      elemDescription: 'Create New Wallet button on Account Not Found screen',
    });
  }

  get updateModalContinueButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('Continue');
  }

  /**
   * Dismiss the "iOS Update Required" modal if present by tapping "Continue".
   * Silently does nothing if the modal is not showing.
   */
  async dismissUpdateModalIfPresent(): Promise<void> {
    try {
      await Assertions.expectElementToBeVisible(
        this.updateModalContinueButton,
        {
          timeout: 3000,
          description: 'iOS update modal',
        },
      );
      await Gestures.waitAndTap(this.updateModalContinueButton, {
        elemDescription: 'Continue button on iOS update modal',
      });
    } catch {
      // Modal not present
    }
  }
}

export default new SocialLoginView();
