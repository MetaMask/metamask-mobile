/**
 * Page Object for Social Login flow screens
 *
 * This includes:
 * - SocialLoginIosUser (iOS new user / existing user confirmation screens)
 * - AccountStatus (Account Already Exists / Account Not Found screens)
 */
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import { AccountStatusSelectorIDs } from '../../selectors/Onboarding/AccountStatus.selectors';

class SocialLoginView {
  // ============================================
  // iOS Social Login Success - New User
  // ============================================

  get iosNewUserTitle(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_TITLE,
    );
  }

  get iosNewUserButton(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
    );
  }

  async isIosNewUserScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.iosNewUserTitle, {
      description: 'iOS New User Social Login screen should be visible',
    });
  }

  async tapIosNewUserSetPinButton(): Promise<void> {
    await Gestures.waitAndTap(this.iosNewUserButton, {
      elemDescription: 'Set MetaMask PIN button on iOS new user screen',
    });
  }

  // ============================================
  // iOS Social Login Success - Existing User
  // ============================================

  get iosExistingUserTitle(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_TITLE,
    );
  }

  get iosExistingUserButton(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
    );
  }

  async isIosExistingUserScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.iosExistingUserTitle, {
      description: 'iOS Existing User Social Login screen should be visible',
    });
  }

  async tapIosExistingUserSecureWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.iosExistingUserButton, {
      elemDescription: 'Secure your wallet button on iOS existing user screen',
    });
  }

  // ============================================
  // Account Already Exists (existing user during Create Wallet)
  // ============================================

  get accountFoundContainer(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER,
    );
  }

  get accountFoundTitle(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE,
    );
  }

  get accountFoundLoginButton(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
    );
  }

  get accountFoundDifferentMethodButton(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON,
    );
  }

  async isAccountFoundScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.accountFoundContainer, {
      description: 'Account Already Exists screen should be visible',
    });
  }

  async tapLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.accountFoundLoginButton, {
      elemDescription: 'Login button on Account Already Exists screen',
    });
  }

  // ============================================
  // Account Not Found (new user during Import Wallet)
  // ============================================

  get accountNotFoundContainer(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER,
    );
  }

  get accountNotFoundTitle(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE,
    );
  }

  get accountNotFoundCreateButton(): DetoxElement {
    return Matchers.getElementByID(
      AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
    );
  }

  async isAccountNotFoundScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.accountNotFoundContainer, {
      description: 'Account Not Found screen should be visible',
    });
  }

  async tapCreateNewWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.accountNotFoundCreateButton, {
      elemDescription: 'Create New Wallet button on Account Not Found screen',
    });
  }
}

export default new SocialLoginView();
